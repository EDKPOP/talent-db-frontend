'use client';

import { useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getApiAuthStatus,
  getServerApiAuthStatus,
  subscribeApiAuthStatus,
} from '@/lib/api-auth';

/**
 * API 가 401 을 돌려줄 때 사용자에게 상태를 보여준다.
 * 자동 재시도도, 로그인 리다이렉트도 하지 않는다 — 둘 다 루프가 되기 때문이다.
 * 재시도는 오직 사용자가 버튼을 눌렀을 때만 일어난다.
 */
export function ApiAuthBanner() {
  const status = useSyncExternalStore(
    subscribeApiAuthStatus,
    getApiAuthStatus,
    getServerApiAuthStatus,
  );
  const queryClient = useQueryClient();

  if (status !== 'unauthorized') return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-red-600 px-4 py-2 text-sm text-white"
    >
      <span>
        API 인증에 실패했습니다 (401). 데이터를 불러올 수 없습니다.
      </span>
      <button
        type="button"
        onClick={() => queryClient.refetchQueries()}
        className="rounded border border-white/60 px-2 py-0.5 text-xs font-semibold underline-offset-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        다시 시도
      </button>
    </div>
  );
}
