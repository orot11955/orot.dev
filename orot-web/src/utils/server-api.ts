import type { ApiEnvelope, ApiListPayload, PaginatedResponse } from '@/types';
import { headers } from 'next/headers';
import { webServerLogger } from '@/logging/server';
import { createRequestId } from '@/logging/shared';
import { resolveServerApiBaseUrl } from './api-origin';

interface ServerGetOptions extends Omit<RequestInit, 'next'> {
  revalidate?: number | false;
}

function getApiBase(): string {
  return resolveServerApiBaseUrl();
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

export async function serverGet<T>(
  path: string,
  params?: Record<string, string | number>,
  options?: ServerGetOptions,
): Promise<T | null> {
  const requestId = await resolveServerRequestId();
  const { revalidate = 60, ...requestOptions } = options ?? {};
  const shouldUseRevalidate =
    revalidate !== false && requestOptions.cache !== 'no-store';

  try {
    const base = getApiBase();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${base}${normalizedPath}`);

    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }

    const fetchOptions: RequestInit & {
      next?: {
        revalidate: number;
      };
    } = {
      ...requestOptions,
      headers: mergeRequestHeaders(requestOptions.headers, requestId),
    };

    if (shouldUseRevalidate) {
      fetchOptions.next = { revalidate };
    }

    const res = await fetch(url.toString(), fetchOptions);

    if (!res.ok) {
      webServerLogger.warn('server.fetch.failed', {
        requestId,
        method: requestOptions.method ?? 'GET',
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
        url: url.toString(),
        statusCode: res.status,
      });
      return null;
    }
  } catch (error) {
    webServerLogger.error('server.fetch.error', error, {
      requestId,
      method: requestOptions.method ?? 'GET',
      path,
    });
    return null;
  }
}

export function toPaginatedResponse<T>(
  payload: ApiListPayload<T>,
): PaginatedResponse<T> {
  return {
    data: payload.items,
    total: payload.meta.total,
    page: payload.meta.page,
    limit: payload.meta.limit,
    totalPages: payload.meta.totalPages,
  };
}
