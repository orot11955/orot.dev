import { api } from './api';
import { apiPaths } from './api-routes';
import { tokenStore } from './api-client';
import {
  clearAuthSessionHint,
  setAuthSessionHint,
} from './auth-session';
import {
  DEMO_AUTH_STORAGE_KEY,
  DEMO_USER,
  isDemoMode,
} from '@/demo/mode';
import type {
  AuthTokens,
  ChangePasswordPayload,
  LoginPayload,
  LoginResponse,
  User,
} from '@/types';

const DEMO_ACCESS_TOKEN = 'demo-access-token';

function setDemoAuth(enabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, '1');
    return;
  }

  window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
}

function hasDemoAuth() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) === '1';
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    if (isDemoMode()) {
      if (payload.username !== DEMO_USER.username || payload.password !== 'demo1234') {
        throw new Error('Invalid credentials');
      }

      tokenStore.set(DEMO_ACCESS_TOKEN);
      setDemoAuth(true);
      setAuthSessionHint();
      return {
        accessToken: DEMO_ACCESS_TOKEN,
        user: DEMO_USER,
      };
    }

    const data = await api.post<LoginResponse>(apiPaths.auth('login'), payload);
    tokenStore.set(data.accessToken);
    setAuthSessionHint();
    return data;
  },

  async refresh(): Promise<AuthTokens> {
    if (isDemoMode()) {
      if (!hasDemoAuth()) {
        throw new Error('Unauthorized');
      }

      tokenStore.set(DEMO_ACCESS_TOKEN);
      setAuthSessionHint();
      return { accessToken: DEMO_ACCESS_TOKEN };
    }

    const data = await api.post<AuthTokens>(apiPaths.auth('refresh'));
    tokenStore.set(data.accessToken);
    setAuthSessionHint();
    return data;
  },

  async logout(): Promise<void> {
    if (isDemoMode()) {
      setDemoAuth(false);
      clearAuthSessionHint();
      tokenStore.clear();
      return;
    }

    try {
      await api.post(apiPaths.auth('logout'));
    } finally {
      clearAuthSessionHint();
      tokenStore.clear();
    }
  },

  async me(): Promise<User> {
    if (isDemoMode()) {
      if (!hasDemoAuth()) {
        throw new Error('Unauthorized');
      }

      return DEMO_USER;
    }

    return api.get<User>(apiPaths.auth('me'));
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    if (isDemoMode()) {
      void payload;
      return;
    }

    await api.post(apiPaths.auth('change-password'), payload);
  },
};
