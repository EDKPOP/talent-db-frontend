/**
 * 서버 전용 — talent-api 업스트림 주소와 bearer 토큰을 읽는 유일한 지점.
 *
 * ⚠️ 이 모듈은 절대 클라이언트 컴포넌트에서 import 하지 말 것. 토큰은 서버 env
 * (`TALENT_API_TOKEN`) 에만 존재하고, `NEXT_PUBLIC_*` 접두사 사용은 COU-2079 결정
 * 2(a) 로 금지되어 있다. 브라우저는 `/api/proxy/*` 와 `/api/media/*` 만 호출한다.
 *
 * 저장소에 `server-only` 패키지가 없으므로 런타임 가드로 대신한다 — 실수로 클라이언트
 * 번들에 섞여 들어가면 조용히 통과하는 대신 즉시 터진다.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/server/talent-api.ts is server-only and must never be imported from client code.',
  );
}

/**
 * 데이터 프록시가 허용하는 최상위 경로 화이트리스트.
 * `lib/api.ts` 의 API 함수들이 실제로 호출하는 것 전부이며, 그 이상은 없다.
 */
const ALLOWED_DATA_ROOTS: ReadonlySet<string> = new Set([
  'candidates',
  'reviews',
  'comments',
  'dashboard',
  'outbound-candidates',
]);

/** 미디어 프록시는 업스트림의 `/media/**` 아래로만 나갈 수 있다. */
const MEDIA_ROOT = 'media';

const MAX_SEGMENTS = 12;
const MAX_SEGMENT_LENGTH = 256;

/** 업스트림으로 넘기는 요청 헤더. cookie / authorization / host 는 의도적으로 제외. */
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'content-type',
  'if-modified-since',
  'if-none-match',
  'range',
] as const;

/** 데이터 응답에서 브라우저로 되돌리는 헤더. */
const FORWARDED_DATA_RESPONSE_HEADERS = ['content-type'] as const;

/** 미디어 응답에서 브라우저로 되돌리는 헤더 (Range·캐시 검증 포함). */
const FORWARDED_MEDIA_RESPONSE_HEADERS = [
  'accept-ranges',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
] as const;

export type ProxyKind = 'data' | 'media';

export type ResolvedUpstream =
  | { ok: true; url: URL }
  | { ok: false; status: number; message: string };

function readBaseUrl(): URL | null {
  const raw = process.env.TALENT_API_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

export function getUpstreamToken(): string | null {
  const raw = process.env.TALENT_API_TOKEN?.trim();
  return raw ? raw : null;
}

/**
 * 세그먼트 하나가 안전한지 판단한다. Next 는 `[...path]` 세그먼트를 이미 디코딩해서
 * 넘기므로, `%2e%2e` / `%2f` 같은 인코딩 우회도 여기서 함께 걸린다.
 */
function isSafeSegment(segment: string): boolean {
  if (segment.length === 0 || segment.length > MAX_SEGMENT_LENGTH) return false;
  if (segment === '.' || segment === '..') return false;
  // 경로 이스케이프(`/` `\\`), 스킴 주입(`:`), 쿼리·프래그먼트 주입(`?` `#`).
  if (/[/\\:?#]/.test(segment)) return false;
  // 제어문자 — 헤더·로그 주입 방지.
  for (const char of segment) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

/**
 * 클라이언트가 준 경로 세그먼트를 서버 env 로 고정된 업스트림에 결합한다.
 *
 * SSRF 방지의 핵심: 호스트·스킴·포트는 전부 `TALENT_API_BASE_URL` 에서만 오고,
 * 클라이언트 입력은 개별 세그먼트로만 쓰인다. 절대 URL·`//`·`..` 은 세그먼트 검사에서
 * 걸리고, 마지막에 조립 결과가 기대한 문자열과 정확히 일치하는지 다시 확인한다.
 */
export function resolveUpstreamUrl(
  kind: ProxyKind,
  segments: readonly string[],
  search: string,
): ResolvedUpstream {
  const base = readBaseUrl();
  if (!base) {
    return { ok: false, status: 500, message: 'Upstream base URL is not configured.' };
  }

  if (segments.length === 0 || segments.length > MAX_SEGMENTS) {
    return { ok: false, status: 400, message: 'Invalid upstream path.' };
  }
  if (!segments.every(isSafeSegment)) {
    return { ok: false, status: 400, message: 'Invalid upstream path.' };
  }
  if (kind === 'data' && !ALLOWED_DATA_ROOTS.has(segments[0])) {
    return { ok: false, status: 404, message: 'Path is not allowed by the proxy allowlist.' };
  }

  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  const relativePath = [...(kind === 'media' ? [MEDIA_ROOT] : []), ...segments]
    .map(encodeURIComponent)
    .join('/');
  const expectedPathname = `${basePath}${relativePath}`;

  let url: URL;
  try {
    url = new URL(expectedPathname, base.origin);
  } catch {
    return { ok: false, status: 400, message: 'Invalid upstream path.' };
  }

  // 조립 후 정규화로 경로가 바뀌었다면(= 무언가 빠져나갔다면) 거부한다.
  if (url.origin !== base.origin || url.pathname !== expectedPathname) {
    return { ok: false, status: 400, message: 'Invalid upstream path.' };
  }

  url.search = search;
  return { ok: true, url };
}

export function buildUpstreamHeaders(request: Request, token: string): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // 브라우저가 보낸 Authorization·Cookie 는 무시하고 서버 토큰만 붙인다.
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export function buildDownstreamHeaders(upstream: Response, kind: ProxyKind): Headers {
  const headers = new Headers();
  const names =
    kind === 'media' ? FORWARDED_MEDIA_RESPONSE_HEADERS : FORWARDED_DATA_RESPONSE_HEADERS;
  for (const name of names) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  // fetch 가 압축을 풀어버리면 업스트림 content-length 는 실제 바이트 수와 다르다.
  if (kind === 'media' && !upstream.headers.get('content-encoding')) {
    const length = upstream.headers.get('content-length');
    if (length) headers.set('content-length', length);
  }

  // 미디어는 미성년 PII 다. 공용 CDN 캐시·검색엔진 색인에 절대 남기지 않는다.
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return headers;
}

/** 토큰·쿠키·업스트림 주소가 응답 본문에 새지 않도록 메시지는 고정 문구만 쓴다. */
export function proxyError(status: number, message: string, headers?: HeadersInit): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
