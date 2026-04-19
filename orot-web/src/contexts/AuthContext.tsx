'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import {
  clearAuthSessionHint,
  hasAuthSessionHint,
} from '@/services/auth-session';
import type { User } from '@/types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, setUser, setLoading, clearUser } = useAuthStore();

  // 페이지 첫 로드 시 세션 복원 — refresh token(httpOnly cookie)으로 silent refresh
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      setLoading(true);
      if (!hasAuthSessionHint()) {
        if (!cancelled) {
          clearUser();
          setLoading(false);
        }
        return;
      }

      try {
        await authService.refresh();
        const me = await authService.me();
        if (!cancelled) setUser(me);
      } catch {
        // 유효한 세션 없음 — 비로그인 상태 유지
        clearAuthSessionHint();
        if (!cancelled) clearUser();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      await authService.login({ username, password });
      const me = await authService.me();
      setUser(me);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUser]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      clearUser();
      setLoading(false);
    }
  }, [setLoading, clearUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
