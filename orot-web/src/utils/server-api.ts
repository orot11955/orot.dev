import type { ApiEnvelope } from '@/types';
import { headers } from 'next/headers';
import { webServerLogger } from '@/logging/server';
import { createRequestId } from '@/logging/shared';
import { resolveServerApiBaseUrls } from './api-origin';
import { isDemoMode } from '@/demo/mode';
import { demoServerGet } from '@/demo/server';

interface ServerGetOptions extends Omit<RequestInit, 'next'> {
  revalidate?: number | false;
}

const DEFAULT_SERVER_API_TIMEOUT_MS = 3_000;

function getApiBase(): string {
  return resolveServerApiBaseUrls()[0];
}

function getApiBases(): string[] {
  return resolveServerApiBaseUrls();
}

function resolveServerApiTimeoutMs(): number {
  const rawTimeout =
    process.env.WEB_SERVER_API_TIMEOUT_MS?.trim() ??
    process.env.SERVER_API_TIMEOUT_MS?.trim();
  if (!rawTimeout) {
    return DEFAULT_SERVER_API_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(rawTimeout, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SERVER_API_TIMEOUT_MS;
}

function mergeAbortSignals(
  requestSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (!requestSignal) {
    return timeoutSignal;
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([requestSignal, timeoutSignal]);
  }

  const controller = new AbortController();

  const abortFrom = (signal: AbortSignal) => {
    if (!controller.signal.aborted) {
      controller.abort(signal.reason);
    }
  };

  if (requestSignal.aborted) {
    abortFrom(requestSignal);
    return controller.signal;
  }

  requestSignal.addEventListener('abort', () => abortFrom(requestSignal), {
    once: true,
  });
  timeoutSignal.addEventListener('abort', () => abortFrom(timeoutSignal), {
    once: true,
  });

  return controller.signal;
}

async function resolveServerRequestId(): Promise<string> {
  try {
    const requestHeaders = await headers();
    return requestHeaders.get('x-request-id')?.trim() || createRequestId('ssr');
  } catch {
    return createRequestId('ssr');
  }
}

function mergeRequestHeaders(
  initHeaders: RequestInit['headers'],
  requestId: string,
): Headers {
  const requestHeaders = new Headers(initHeaders);
  requestHeaders.set('X-Request-Id', requestId);
  requestHeaders.set('X-Request-Source', 'orot-web:ssr');
  return requestHeaders;
}

function createFetchUrl(
  base: string,
  path: string,
  params?: Record<string, string | number>,
): URL {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) =>
      url.searchParams.set(k, String(v)),
    );
  }

  return url;
}

function createFetchOptions(
  requestOptions: Omit<RequestInit, 'next'>,
  requestId: string,
  timeoutMs: number,
): RequestInit {
  const safeRequestOptions = { ...requestOptions } as RequestInit & {
    next?: unknown;
  };
  delete safeRequestOptions.next;

  return {
    ...safeRequestOptions,
    headers: mergeRequestHeaders(requestOptions.headers, requestId),
    signal: mergeAbortSignals(requestOptions.signal, timeoutMs),
  };
}

function isTimeoutError(
  error: unknown,
  requestSignal: AbortSignal | null | undefined,
): boolean {
  return error instanceof Error &&
    (error.name === 'TimeoutError' ||
      (error.name === 'AbortError' &&
        fetchWasAbortedByTimeout(requestSignal)));
}

export async function serverGet<T>(
  path: string,
  params?: Record<string, string | number>,
  options?: ServerGetOptions,
): Promise<T | null> {
  if (isDemoMode()) {
    return demoServerGet<T>(path, params);
  }

  const requestId = await resolveServerRequestId();
  const { revalidate = 60, ...requestOptions } = options ?? {};
  const shouldUseRevalidate =
    revalidate !== false && requestOptions.cache !== 'no-store';
  const timeoutMs = resolveServerApiTimeoutMs();
  const apiBases = getApiBases();
  const attempts: Array<{
    apiBase: string;
    errorName?: string;
    errorMessage?: string;
  }> = [];

  for (const [index, base] of apiBases.entries()) {
    const hasFallback = index < apiBases.length - 1;

    try {
      const url = createFetchUrl(base, path, params);
      const fetchOptions = createFetchOptions(
        requestOptions,
        requestId,
        timeoutMs,
      );

      if (shouldUseRevalidate) {
        fetchOptions.next = { revalidate };
      }

      const res = await fetch(url.toString(), fetchOptions);

      if (!res.ok) {
        webServerLogger.warn('server.fetch.failed', {
          requestId,
          method: requestOptions.method ?? 'GET',
          path,
          apiBase: base,
          url: url.toString(),
          statusCode: res.status,
          apiRequestId: res.headers.get('x-request-id') ?? undefined,
        });
        return null;
      }

      try {
        const json: ApiEnvelope<T> = await res.json();
        return json.data;
      } catch (error) {
        webServerLogger.error('server.fetch.invalid_json', error, {
          requestId,
          method: requestOptions.method ?? 'GET',
          path,
          apiBase: base,
          url: url.toString(),
          statusCode: res.status,
        });
        return null;
      }
    } catch (error) {
      attempts.push({
        apiBase: base,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      const meta = {
        requestId,
        method: requestOptions.method ?? 'GET',
        path,
        apiBase: base,
        timeoutMs,
        attempts,
      };

      if (hasFallback) {
        webServerLogger.warn(
          isTimeoutError(error, requestOptions.signal)
            ? 'server.fetch.timeout_retry'
            : 'server.fetch.error_retry',
          meta,
          error,
        );
        continue;
      }

      if (isTimeoutError(error, requestOptions.signal)) {
        webServerLogger.warn('server.fetch.timeout', meta, error);
        return null;
      }

      webServerLogger.error('server.fetch.error', error, meta);
      return null;
    }
  }

  webServerLogger.error('server.fetch.error', undefined, {
    requestId,
    method: requestOptions.method ?? 'GET',
    path,
    apiBase: getApiBase(),
    attempts,
  });
  return null;
}

export { toPaginatedResponse } from './pagination';

function fetchWasAbortedByTimeout(
  requestSignal: AbortSignal | null | undefined,
): boolean {
  return !requestSignal?.aborted;
}
