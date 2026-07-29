import axios from 'axios';

/**
 * talent-api 인증 상태(401 여부)의 단일 출처.
 *
 * ⚠️ 토큰은 여기 없다. COU-2079 결정 2(a) 에 따라 bearer 토큰은 서버 env
 * (`TALENT_API_TOKEN`) 전용이고, 브라우저는 `/api/proxy/*` · `/api/media/*` 서버
 * 라우트만 호출한다. 토큰 접근은 `lib/server/talent-api.ts` 와 라우트 핸들러 안에서만
 * 일어나며, `NEXT_PUBLIC_*` 토큰은 결정으로 금지되어 있다 — 다시 도입하지 말 것.
 *
 * 이 모듈은 클라이언트 번들에 포함되므로 비밀값을 절대 넣지 말 것.
 */
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
