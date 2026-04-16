'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface AuthState {
  email: string;
  reviewerName: string;
}

interface AuthContextValue {
  user: AuthState | null;
  login: (email: string) => void;
  logout: () => void;
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

  const logout = useCallback(() => {
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
