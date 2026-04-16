'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@c-3.co')) {
      setError('@c-3.co 도메인 이메일만 허용됩니다.');
      return;
    }

    login(trimmed);
    router.replace('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Casting DB</h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            Welcome back. Please enter your @c-3.co email to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@c-3.co"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {error && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Access System
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Authorized access only. All activity is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
