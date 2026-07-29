/**
 * 서버 사이드 접근 게이트의 세션 토큰 (COU-2114).
 *
 * 기존 `lib/auth-context.tsx` 의 `casting-db-auth` 쿠키는 **표시용 상태일 뿐**이고
 * 브라우저가 임의로 만들 수 있다. 이 모듈이 만드는 `casting-db-session` 쿠키만이
 * 서버가 검증하는 유일한 자격이며, 검증은 `middleware.ts` 에서 라우터 전단에 걸린다.
 *
 * Edge 런타임에서 동작해야 하므로 `node:crypto` 대신 Web Crypto (`crypto.subtle`) 만 쓴다.
 * 시크릿 값은 어떤 경로로도 로깅하거나 응답에 싣지 않는다.
 */

export const SESSION_COOKIE = 'casting-db-session';

/** 세션 유효기간. 짧게 두어 유출된 쿠키의 수명을 제한한다. */
const SESSION_TTL_SECONDS = 12 * 60 * 60;

export interface SessionPayload {
  /** 로그인에 사용된 이메일. PII 가 아닌 사내 계정 식별자만 담는다. */
  email: string;
  /** 만료 시각 (epoch seconds). */
  exp: number;
}

/**
 * 게이트 시크릿. **설정되어 있을 때만 게이트가 켜진다.**
 *
 * 되돌리기는 정확히 1스텝 — 호스팅 환경변수에서 `SITE_ACCESS_SECRET` 를 제거하면
 * 배포 없이 게이트가 꺼지고 이전 동작으로 복귀한다.
 */
export function getSessionSecret(): string | null {
  const secret = process.env.SITE_ACCESS_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

/** 공유 패스코드. 시크릿이 켜져 있는데 이 값이 없으면 로그인은 항상 실패한다 (fail-closed). */
export function getAccessPasscode(): string | null {
  const passcode = process.env.SITE_ACCESS_PASSCODE;
  return passcode && passcode.length > 0 ? passcode : null;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** 길이 정보까지 흘리지 않도록 상수 시간 비교를 쓴다. */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

/** `<base64url(payload)>.<base64url(hmac)>` 형태의 서명 토큰을 만든다. */
export async function signSession(email: string, secret: string, nowSeconds: number): Promise<string> {
  const payload: SessionPayload = { email, exp: nowSeconds + SESSION_TTL_SECONDS };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** 서명과 만료를 모두 검증한다. 하나라도 어긋나면 `null`. */
export async function verifySession(
  token: string | undefined,
  secret: string,
  nowSeconds: number,
): Promise<SessionPayload | null> {
  if (!token) return null;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const encodedPayload = token.slice(0, separator);
  const encodedSignature = token.slice(separator + 1);

  let valid: boolean;
  try {
    const key = await importKey(secret);
    valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return null;
  }

  if (typeof payload?.email !== 'string' || typeof payload?.exp !== 'number') return null;
  if (payload.exp <= nowSeconds) return null;

  return payload;
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
