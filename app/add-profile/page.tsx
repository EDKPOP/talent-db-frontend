'use client';

import { useState, FormEvent } from 'react';
import { createCandidate } from '@/lib/api';

function extractUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes('instagram.com')) {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) return segments[0].toLowerCase();
    }
  } catch {
    // not a URL
  }

  const cleaned = trimmed.replace(/^@/, '').toLowerCase();
  if (/^[a-z0-9._]+$/.test(cleaned)) return cleaned;

  return null;
}

interface AddResult {
  username: string;
  success: boolean;
  message: string;
}

export default function AddProfilePage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AddResult[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const lines = input
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    setLoading(true);
    const newResults: AddResult[] = [];

    for (const line of lines) {
      const username = extractUsername(line);
      if (!username) {
        newResults.push({ username: line, success: false, message: '유효하지 않은 형식' });
        continue;
      }

      try {
        await createCandidate({
          username,
          profileLink: `https://instagram.com/${username}`,
        });
        newResults.push({ username, success: true, message: '추가 완료' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '서버 오류';
        newResults.push({ username, success: false, message: msg });
      }
    }

    setResults((prev) => [...newResults, ...prev]);
    setInput('');
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">수동 프로필 추가</h1>
      <p className="text-sm text-gray-500 mb-6">
        인스타그램 프로필 주소 또는 사용자명을 입력하면 스코어링 없이 바로 DB에 추가됩니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"https://instagram.com/username\n@username\nusername\n\n여러 개를 줄바꿈 또는 쉼표로 구분하여 입력 가능"}
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full py-3 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '추가 중...' : 'DB에 추가'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">결과</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={`${r.username}-${i}`}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm ${
                  r.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <span className="font-medium">@{r.username}</span>
                <span>{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
