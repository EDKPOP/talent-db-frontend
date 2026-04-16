'use client';

import { createContext, useContext, useCallback, useSyncExternalStore } from 'react';

interface AuthState {
  email: string;
  reviewerName: string;
}

interface AuthContextValue {
  user: AuthState | null;
  isLoading: boolean;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'casting-db-auth';

// Module-scoped subscription for useSyncExternalStore
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}
function notifyListeners() {
  for (const fn of listeners) fn();
}

// Cached snapshot to avoid re-parsing JSON on every render
let cachedRaw: string | null | undefined;
let cachedUser: AuthState | null = null;

function getSnapshot(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    if (!raw) {
      cachedUser = null;
    } else {
      try { cachedUser = JSON.parse(raw); }
      catch { cachedUser = null; }
    }
  }
  return cachedUser;
}

function getServerSnapshot(): AuthState | null {
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = useCallback((email: string) => {
    const reviewerName = email.split('@')[0];
    const state: AuthState = { email, reviewerName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    cachedRaw = undefined; // invalidate cache
    notifyListeners();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = undefined; // invalidate cache
    notifyListeners();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
