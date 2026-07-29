import { QueryClient } from '@tanstack/react-query';
import { isUnauthorizedError } from './api-auth';

const MAX_RETRIES = 2;

/**
 * 401 은 재시도해도 절대 성공하지 않는다. 재시도하면 인증 게이트 배포 순간
 * 모든 쿼리가 무한 재시도 폭풍을 일으키므로 즉시 실패시킨다.
 */
function retryUnlessUnauthorized(failureCount: number, error: unknown): boolean {
  if (isUnauthorizedError(error)) return false;
  return failureCount < MAX_RETRIES;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: retryUnlessUnauthorized,
      },
      mutations: {
        retry: retryUnlessUnauthorized,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
