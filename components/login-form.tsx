'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface LoginFormProps {
  /** 서버 접근 게이트가 켜진 배포인지 (`app/login/page.tsx` 에서 주입). */
  gateEnabled: boolean;
  /** 로그인 후 돌아갈 같은 오리진 경로. 검증은 서버 컴포넌트에서 끝났다. */
  redirectTo: string;
}

export function LoginForm({ gateEnabled, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@c-3.co')) {
      setError('@c-3.co 도메인 이메일만 허용됩니다.');
      return;
    }

    if (!gateEnabled) {
      login(trimmed);
      router.replace(redirectTo);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, passcode }),
      });

      if (!response.ok) {
        setError(
          response.status === 503
            ? '접근 게이트 설정이 완료되지 않았습니다. 사이트 관리자에게 문의하세요.'
            : '이메일 또는 접근 코드가 올바르지 않습니다.',
        );
        return;
      }

      login(trimmed);
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError('로그인 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="yourname@c-3.co"
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {gateEnabled && (
        <div>
          <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-1.5">
            접근 코드
          </label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? '확인 중…' : 'Access System'}
      </button>
    </form>
  );
}
