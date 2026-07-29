'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface AuthState {
  email: string;
  reviewerName: string;
}

interface AuthContextValue {
  user: AuthState | null;
  login: (email: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const COOKIE_KEY = 'casting-db-auth';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function readUser(): AuthState | null {
  const raw = getCookie(COOKIE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(readUser);

  const login = useCallback((email: string) => {
    const reviewerName = email.split('@')[0];
    const state: AuthState = { email, reviewerName };
    setCookie(COOKIE_KEY, JSON.stringify(state));
    setUser(state);
  }, []);

  const logout = useCallback(async () => {
    // 표시용 쿠키를 지우는 것만으로는 서버 세션(`casting-db-session`)이 남는다.
    // 요청이 실패해도 서버 TTL 로 만료되므로 로컬 상태 정리는 그대로 진행한다.
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* 네트워크 실패는 무시 — 아래에서 로컬 상태는 반드시 정리한다. */
    }
    deleteCookie(COOKIE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
