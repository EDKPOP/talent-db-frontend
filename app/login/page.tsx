import { LoginForm } from '@/components/login-form';
import { getSessionSecret } from '@/lib/session';

/**
 * 게이트 활성 여부는 서버 env 로만 알 수 있으므로 이 페이지는 서버 컴포넌트로 두고
 * 폼만 클라이언트로 내린다 (COU-2114).
 */
export const dynamic = 'force-dynamic';

/** 같은 오리진의 경로만 허용 — 오픈 리다이렉트 방지. */
function safeRedirectTarget(next: string | string[] | undefined): string {
  if (typeof next !== 'string') return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const gateEnabled = getSessionSecret() !== null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Casting DB</h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            {gateEnabled
              ? '@c-3.co 이메일과 접근 코드를 입력하세요.'
              : 'Welcome back. Please enter your @c-3.co email to continue.'}
          </p>

          <LoginForm gateEnabled={gateEnabled} redirectTo={safeRedirectTarget(next)} />

          <p className="mt-6 text-xs text-gray-400 text-center">
            Authorized access only. All activity is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
