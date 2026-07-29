import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  getAccessPasscode,
  getSessionSecret,
  sessionCookieOptions,
  signSession,
  timingSafeEqual,
} from '@/lib/session';

/**
 * 접근 게이트 로그인 (COU-2114).
 *
 * 이메일 도메인 검사는 `app/login/page.tsx` 에도 있지만 그건 UX 용이고,
 * 실제로 신뢰되는 검사는 여기 서버 측 검사뿐이다.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EMAIL_DOMAIN = '@c-3.co';

export async function POST(request: NextRequest): Promise<Response> {
  const secret = getSessionSecret();
  if (!secret) {
    // 게이트가 꺼진 배포 — 세션을 만들 이유가 없다.
    return NextResponse.json({ error: 'Access gate is disabled.' }, { status: 404 });
  }

  const passcode = getAccessPasscode();
  if (!passcode) {
    // 시크릿만 설정되고 패스코드가 빠진 설정 오류. 열어주지 않고 막는다(fail-closed).
    return NextResponse.json(
      { error: 'Access gate is misconfigured. Contact the site owner.' },
      { status: 503 },
    );
  }

  let body: { email?: unknown; passcode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const submittedPasscode = typeof body.passcode === 'string' ? body.passcode : '';

  // 이메일이 틀렸는지 패스코드가 틀렸는지 구분해주지 않는다.
  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN) || !timingSafeEqual(submittedPasscode, passcode)) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const token = await signSession(email, secret, Math.floor(Date.now() / 1000));
  const response = NextResponse.json({ email, reviewerName: email.split('@')[0] });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
