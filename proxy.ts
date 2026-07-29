import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, getSessionSecret, verifySession } from '@/lib/session';

/**
 * 서버 사이드 접근 게이트 (COU-2114 / [COU-2058] 인증 게이트의 프런트엔드 몫).
 *
 * 배경: 이 앱의 인증은 지금까지 `components/auth-guard.tsx` 의 **클라이언트 검사뿐**이라
 * 모든 라우트가 무인증 요청에 200 + HTML 을 그대로 돌려준다. 이 파일(Next 16 의
 * `proxy` 컨벤션 — 구 `middleware`)은 라우터 전단에서 돌기 때문에 클라이언트 우회가
 * 불가능한 유일한 지점이다.
 *
 * 켜고 끄기는 호스팅 환경변수 `SITE_ACCESS_SECRET` 의 유무가 전부다 — 코드 revert 도
 * PR 되돌림도 필요 없다. 값이 없으면 게이트는 통째로 비활성이고 이 파일은 현행 동작을
 * 바꾸지 않는다. 다만 Vercel 환경변수 변경은 **기존 배포에 소급 적용되지 않으므로**
 * 실제 되돌리기는 `변수 삭제 + 재배포 1회` 두 스텝이다 (COU-2063 의 "정확히 1스텝"
 * 요건 대비 정정 — 2026-07-30 실측 보고).
 * (Vercel 플랜과 무관하게 동작하므로 Deployment Protection 428 제약을 받지 않는다.)
 */

/** 게이트 밖에 둘 수 있는 경로 — PII 를 반환하지 않는 것만 명시적으로 나열한다. */
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout']);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

function unauthorizedApiResponse(): NextResponse {
  const response = NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function loginRedirect(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  // 로그인 후 원래 가려던 곳으로 돌려보내되, 오픈 리다이렉트가 되지 않도록
  // 같은 오리진의 경로 부분만 넘긴다.
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (target !== '/' && !target.startsWith('//')) {
    url.searchParams.set('next', target);
  }
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export default async function proxy(request: NextRequest) {
  const secret = getSessionSecret();
  if (!secret) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, secret, Math.floor(Date.now() / 1000));
  if (session) return NextResponse.next();

  // 브라우저가 아닌 호출(프록시·미디어)에 리다이렉트를 주면 200 HTML 로 오해될 수 있어
  // API 계열은 401 로 끊는다.
  return pathname.startsWith('/api/') ? unauthorizedApiResponse() : loginRedirect(request);
}

export const config = {
  // 정적 자산만 제외한다. `/api/proxy/*` 와 `/api/media/*` 는 반드시 게이트를 통과해야
  // 하므로 제외 목록에 넣지 말 것 — URL 추측만으로 얼굴 이미지를 받을 수 없어야 한다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
