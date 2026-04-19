import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { apiPaths } from './api-routes';
import { webClientLogger, getClientSessionId } from '@/logging/client';
import { clearAuthSessionHint, setAuthSessionHint } from './auth-session';
import { createRequestId } from '@/logging/shared';
import { resolvePublicApiBaseUrl, resolvePublicApiOrigin } from '@/utils/api-origin';
import type { ApiEnvelope, ApiError, AuthTokens } from '@/types';

export const API_ORIGIN = resolvePublicApiOrigin();
const API_BASE_URL = resolvePublicApiBaseUrl();

export function resolveApiAssetUrl(path?: string | null): string {
  if (!path) {
    return '';
  }

  if (/^(https?:|data:|blob:)/i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_ORIGIN
    ? new URL(normalizedPath, API_ORIGIN).toString()
    : normalizedPath;
}

// ─── Instance ─────────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // refresh token cookie 전송
});

// ─── Access Token Storage (memory-only, SSR-safe) ────────────────────────────

let _accessToken: string | null = null;

export const tokenStore = {
  get: () => _accessToken,
  set: (token: string | null) => {
    _accessToken = token;
  },
  clear: () => {
    _accessToken = null;
  },
};

function toAxiosHeaders(headers?: AxiosRequestConfig['headers']) {
  return AxiosHeaders.from(
    headers as string | AxiosHeaders | Record<string, string> | undefined,
  );
}

interface RequestMetadata {
  requestId: string;
  startedAt: number;
}

type RequestConfigWithMetadata = InternalAxiosRequestConfig & {
  metadata?: RequestMetadata;
};

type RetryConfig = AxiosRequestConfig & {
  _retry?: boolean;
  metadata?: RequestMetadata;
};

function getHeaderValue(
  headers: AxiosRequestConfig['headers'] | Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof AxiosHeaders) {
    const value = headers.get(key);
    if (Array.isArray(value)) {
      return value[0];
    }

    return typeof value === 'string' ? value : value?.toString();
  }

  const record = headers as Record<string, unknown>;
  const value =
    record[key] ??
    record[key.toLowerCase()] ??
    record[key.toUpperCase()];

  if (Array.isArray(value)) {
    return value[0]?.toString();
  }

  return typeof value === 'string' ? value : value?.toString();
}

function getDurationMs(metadata?: RequestMetadata): number | undefined {
  if (!metadata) {
    return undefined;
  }

  return Date.now() - metadata.startedAt;
}

// ─── Request Interceptor — attach access token ────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const requestConfig = config as RequestConfigWithMetadata;
    const token = tokenStore.get();
    const headers = toAxiosHeaders(config.headers);
    const requestId = getHeaderValue(headers, 'X-Request-Id') ?? createRequestId('req');
    const clientSessionId = getClientSessionId();

    if (
      typeof FormData !== 'undefined' &&
      config.data instanceof FormData
    ) {
      headers.delete('Content-Type');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    headers.set('X-Request-Id', requestId);
    headers.set('X-Request-Source', 'orot-web:browser');
    if (clientSessionId) {
      headers.set('X-Client-Session-Id', clientSessionId);
    }

    requestConfig.metadata = {
      requestId,
      startedAt: Date.now(),
    };
    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — silent token refresh on 401 ──────────────────────

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(token: string | null, error: unknown = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  refreshQueue = [];
}

function applyBearerToken(
  config: AxiosRequestConfig,
  token: string,
): AxiosRequestConfig {
  const headers = toAxiosHeaders(config.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return {
    ...config,
    headers,
  };
}

apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV !== 'production') {
      const metadata = (response.config as RetryConfig | undefined)?.metadata;

      webClientLogger.debug('api.request.completed', {
        requestId: metadata?.requestId,
        apiRequestId: getHeaderValue(response.headers, 'x-request-id'),
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        statusCode: response.status,
        durationMs: getDurationMs(metadata),
      });
    }

    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const original = error.config as
      | RetryConfig
      | undefined;

    if (!original) {
      webClientLogger.error('api.request.failed', error);
      return Promise.reject(error);
    }

    // 401 이고, 이미 retry 아니고, refresh 엔드포인트 자체가 아닌 경우
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes(apiPaths.auth('refresh'))
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => resolve(apiClient(applyBearerToken(original, token))),
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const response = await apiClient.post<ApiEnvelope<AuthTokens>>(
          apiPaths.auth('refresh'),
        );
        const authTokens = response.data.data;

        tokenStore.set(authTokens.accessToken);
        setAuthSessionHint();
        processQueue(authTokens.accessToken);

        return apiClient(applyBearerToken(original, authTokens.accessToken));
      } catch (refreshError) {
        clearAuthSessionHint();
        tokenStore.clear();
        processQueue(null, refreshError);
        const metadata = original.metadata;

        webClientLogger.warn('auth.session.recovery_failed', {
          requestId: metadata?.requestId,
          url: original.url,
          statusCode: (refreshError as AxiosError<ApiError>).response?.status,
          durationMs: getDurationMs(metadata),
        });

        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/studio/login'
        ) {
          window.location.href = '/studio/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    webClientLogger.error('api.request.failed', error, {
      requestId: original.metadata?.requestId,
      apiRequestId:
        error.response?.data?.requestId ??
        getHeaderValue(error.response?.headers, 'x-request-id'),
      method: original.method?.toUpperCase(),
      url: original.url,
      statusCode: error.response?.status,
      durationMs: getDurationMs(original.metadata),
    });

    return Promise.reject(error);
  },
);

export default apiClient;
