import type { NextRequest } from 'next/server';
import {
  buildDownstreamHeaders,
  buildUpstreamHeaders,
  getUpstreamToken,
  proxyError,
  resolveUpstreamUrl,
} from '@/lib/server/talent-api';

/**
 * talent-api `/media/**` 스트리밍 프록시.
 *
 * `<Image>` 와 `<video>` 는 브라우저가 직접 요청하므로 Authorization 헤더를 붙일 수
 * 없다. 그래서 이 라우트가 서버에서 토큰을 붙여 중계한다.
 *
 * 응답 본문은 버퍼링하지 않고 업스트림 스트림을 그대로 넘긴다 (비디오 필수).
 * Range 요청은 업스트림에 전달하고 206·Content-Range 를 그대로 되돌린다.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;

  const resolved = resolveUpstreamUrl('media', path ?? [], request.nextUrl.search);
  if (!resolved.ok) return proxyError(resolved.status, resolved.message);

  const token = getUpstreamToken();
  if (!token) return proxyError(500, 'Upstream credentials are not configured.');

  let upstream: Response;
  try {
    upstream = await fetch(resolved.url, {
      method: request.method,
      headers: buildUpstreamHeaders(request, token),
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return proxyError(502, 'Upstream request failed.');
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return proxyError(502, 'Upstream returned an unexpected redirect.');
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildDownstreamHeaders(upstream, 'media'),
  });
}

export const GET = forward;
export const HEAD = forward;
