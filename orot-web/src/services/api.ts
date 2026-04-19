import type { AxiosRequestConfig } from 'axios';
import apiClient from './api-client';
import type { ApiEnvelope, ApiListPayload, PaginatedResponse } from '@/types';

type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>;

type FormValue = string | number | boolean | Blob | Date;
type FormEntryValue = FormValue | FormValue[] | null | undefined;

function unwrapApiEnvelope<T>(payload: ApiEnvelope<T>): T {
  return payload.data;
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiEnvelope<T>>(config);
  return unwrapApiEnvelope(response.data);
}

export const api = {
  get<T>(url: string, config?: RequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'GET', url });
  },

  post<T = unknown, B = unknown>(
    url: string,
    data?: B,
    config?: RequestConfig,
  ): Promise<T> {
    return request<T>({ ...config, method: 'POST', url, data });
  },

  patch<T = unknown, B = unknown>(
    url: string,
    data?: B,
    config?: RequestConfig,
  ): Promise<T> {
    return request<T>({ ...config, method: 'PATCH', url, data });
  },

  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'DELETE', url });
  },
};

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

function appendFormDataValue(formData: FormData, key: string, value: FormValue) {
  if (value instanceof Date) {
    formData.append(key, value.toISOString());
    return;
  }

  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  formData.append(key, String(value));
}

export function createFormData(
  entries: Record<string, FormEntryValue>,
): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => appendFormDataValue(formData, key, item));
      continue;
    }

    appendFormDataValue(formData, key, value);
  }

  return formData;
}
