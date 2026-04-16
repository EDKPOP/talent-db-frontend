'use client';

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

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

type State = { user: AuthState | null; isLoading: boolean };
type Action =
  | { type: 'hydrate'; user: AuthState | null }
  | { type: 'login'; user: AuthState }
  | { type: 'logout' };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate': return { user: action.user, isLoading: false };
    case 'login': return { user: action.user, isLoading: false };
    case 'logout': return { user: null, isLoading: false };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, isLoading: true });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let user: AuthState | null = null;
    if (stored) {
      try { user = JSON.parse(stored); }
      catch { localStorage.removeItem(STORAGE_KEY); }
    }
    dispatch({ type: 'hydrate', user });
  }, []);

  const login = useCallback((email: string) => {
    const reviewerName = email.split('@')[0];
    const authState: AuthState = { email, reviewerName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
    dispatch({ type: 'login', user: authState });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'logout' });
  }, []);

  return (
    <AuthContext.Provider value={{ user: state.user, isLoading: state.isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
