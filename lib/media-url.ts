/**
 * 미디어 URL → 프록시 경로 변환의 **유일한** 지점.
 *
 * talent-api 가 돌려주는 `profileImageUrl` / `bestPostImageUrl` / `sampleImageUrls` /
 * `sampleVideos` 는 업스트림 절대 URL(`https://<host>/media/...`)이다. 브라우저가 그
 * 주소를 직접 때리면 Authorization 헤더가 없으니 401 이 된다. 그래서 모든 미디어
 * 요소는 이 헬퍼를 거쳐 같은 오리진의 `/api/media/*` 로만 나간다.
 *
 * 업스트림 호스트 이름은 여기서 알 필요가 없다 — 경로만 보고 판단하고, 호스트는
 * 서버 라우트가 env 로 고정한다. 클라이언트 번들에 업스트림 주소도 남지 않는다.
 */
const MEDIA_PROXY_PREFIX = '/api/media/';
const UPSTREAM_MEDIA_ROOT = 'media';

/**
 * 프록시로 바꿀 수 없는 값은 `null` 을 돌려준다 — 프록시를 우회해 미인증 요청을
 * 내보내는 것보다 렌더링을 포기하는 쪽이 안전하다(fail closed). 호출부는 이미
 * 이미지 없음 상태를 처리하고 있다.
 */
export function mediaProxyUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(MEDIA_PROXY_PREFIX)) return trimmed; // 이미 프록시 경로 (멱등)

  let parsed: URL;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      parsed = new URL(trimmed);
    } else if (trimmed.startsWith('/')) {
      // 상대 경로도 같은 규칙으로 다룬다. base 는 파싱용 더미이며 결과에 쓰이지 않는다.
      parsed = new URL(trimmed, 'https://media-url.invalid');
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2 || segments[0] !== UPSTREAM_MEDIA_ROOT) return null;

  return `${MEDIA_PROXY_PREFIX}${segments.slice(1).join('/')}${parsed.search}`;
}

/** 배열용. 프록시로 바꿀 수 없는 항목은 조용히 버린다. */
export function mediaProxyUrls(
  rawUrls: readonly (string | null | undefined)[] | null | undefined,
): string[] {
  if (!rawUrls) return [];
  return rawUrls
    .map(mediaProxyUrl)
    .filter((url): url is string => url !== null);
}
