import axios from 'axios';

/**
 * talent-api 인증의 단일 출처(single source of truth).
 *
 * ⚠️ 트레이드오프 — 현재 저장소의 모든 페이지는 `'use client'` + `useQuery` 구조라
 * 브라우저가 talent-api 를 직접 호출한다. 그래서 토큰을 브라우저까지 내려보내려면
 * `NEXT_PUBLIC_` 접두사가 필요한데, Next.js 는 이 값을 빌드 시점에 클라이언트 번들에
 * 그대로 인라인한다. 즉 이 토큰은 사실상 공개값이며 비밀이 아니다.
 *
 * 이것은 최종안이 아니다. 백엔드 전 라우트 인증 게이트가 배포될 때 UI 가 전면 401 이
 * 되는 것을 막기 위한 최소 동반 변경일 뿐이다. 최종 구조(프런트 프록시 라우트 또는
 * 서버 세션)가 결정되면 `getApiToken()` 한 곳만 교체하면 되도록 토큰 접근 지점을
 * 여기로 일원화해 두었다. 호출부에는 절대 흩뿌리지 말 것.
 */
export function getApiToken(): string | undefined {
  // NEXT_PUBLIC_* 는 빌드 시 정적 치환되므로 반드시 리터럴로 참조해야 한다.
  return process.env.NEXT_PUBLIC_API_TOKEN || undefined;
}

export type ApiAuthStatus = 'ok' | 'unauthorized';

let status: ApiAuthStatus = 'ok';
const listeners = new Set<() => void>();

export function getApiAuthStatus(): ApiAuthStatus {
  return status;
}

/** SSR/prerender 중에는 항상 'ok' — 서버에서는 API 를 호출하지 않는다. */
export function getServerApiAuthStatus(): ApiAuthStatus {
  return 'ok';
}

export function setApiAuthStatus(next: ApiAuthStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

export function subscribeApiAuthStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
