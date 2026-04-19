import { api } from './api';
import { apiPaths } from './api-routes';
import { tokenStore } from './api-client';
import {
  clearAuthSessionHint,
  setAuthSessionHint,
} from './auth-session';
import type {
  AuthTokens,
  ChangePasswordPayload,
  LoginPayload,
  LoginResponse,
  User,
} from '@/types';

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>(apiPaths.auth('login'), payload);
    tokenStore.set(data.accessToken);
    setAuthSessionHint();
    return data;
  },

  async refresh(): Promise<AuthTokens> {
    const data = await api.post<AuthTokens>(apiPaths.auth('refresh'));
    tokenStore.set(data.accessToken);
    setAuthSessionHint();
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post(apiPaths.auth('logout'));
    } finally {
      clearAuthSessionHint();
      tokenStore.clear();
    }
  },

  async me(): Promise<User> {
    return api.get<User>(apiPaths.auth('me'));
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await api.post(apiPaths.auth('change-password'), payload);
  },
};
