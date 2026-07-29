import type { NextRequest } from 'next/server';
import {
  buildDownstreamHeaders,
  buildUpstreamHeaders,
  getUpstreamToken,
  proxyError,
  resolveUpstreamUrl,
} from '@/lib/server/talent-api';

/**
 * talent-api 데이터 프록시.
 *
 * 브라우저는 이 라우트만 호출하고 bearer 토큰은 보지 못한다 (COU-2079 결정 2(a)).
 * 업스트림 호스트는 서버 env 로 고정되고 클라이언트는 경로 세그먼트만 줄 수 있다 —
 * 검증은 전부 `lib/server/talent-api.ts` 의 `resolveUpstreamUrl()` 에 있다.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = 'GET, HEAD, POST, PATCH';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;

  const resolved = resolveUpstreamUrl('data', path ?? [], request.nextUrl.search);
  if (!resolved.ok) return proxyError(resolved.status, resolved.message);

  const token = getUpstreamToken();
  if (!token) return proxyError(500, 'Upstream credentials are not configured.');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(resolved.url, {
      method: request.method,
      headers: buildUpstreamHeaders(request, token),
      body: hasBody ? await request.arrayBuffer() : undefined,
      // 리다이렉트를 따라가면 고정 호스트 밖으로 나가고 Authorization 헤더까지 새어나간다.
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    // 실패 사유에 URL·토큰이 섞여 나가지 않도록 예외 내용을 로그·응답에 담지 않는다.
    return proxyError(502, 'Upstream request failed.');
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return proxyError(502, 'Upstream returned an unexpected redirect.');
  }

  // 401/5xx 는 상태코드를 그대로 넘긴다 — 401 배너와 재시도 차단(COU-2078)이 그대로 동작해야 한다.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildDownstreamHeaders(upstream, 'data'),
  });
}

function methodNotAllowed(method: string): Response {
  return proxyError(405, `${method} is not allowed through this proxy.`, {
    allow: ALLOWED_METHODS,
  });
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PATCH = forward;

/**
 * 파괴적 동사는 프록시에서도 막는다. 백엔드 하드블록(COU-2064)이 유일한 방어선이
 * 되지 않도록 하는 이중 차단이며, 프록시가 그 게이트를 우회하는 통로가 되어선 안 된다.
 */
export function DELETE(): Response {
  return methodNotAllowed('DELETE');
}

export function PUT(): Response {
  return methodNotAllowed('PUT');
}
