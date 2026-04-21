import type { AxiosRequestConfig } from 'axios';
import { api, createFormData, type FormEntryValue } from './api';
import type { ApiListPayload, PaginatedResponse } from '@/types';
import { toPaginatedResponse } from '@/utils/pagination';

type QueryParams = AxiosRequestConfig['params'];

export async function listResource<TItem>(
  path: string,
  params?: QueryParams,
): Promise<PaginatedResponse<TItem>> {
  const data = await api.get<ApiListPayload<TItem>>(path, { params });
  return toPaginatedResponse(data);
}

export function getResource<T>(path: string): Promise<T> {
  return api.get<T>(path);
}

export function createResource<T, B = unknown>(
  path: string,
  payload?: B,
): Promise<T> {
  return api.post<T, B>(path, payload);
}

export function patchResource<T, B = unknown>(
  path: string,
  payload?: B,
): Promise<T> {
  return api.patch<T, B>(path, payload);
}

export function deleteResource<T = void>(path: string): Promise<T> {
  return api.delete<T>(path);
}

export function postFormResource<T>(
  path: string,
  entries: Record<string, FormEntryValue>,
): Promise<T> {
  return api.post<T>(path, createFormData(entries));
}

export function uploadImageResource<T>(
  path: string,
  file: File,
  entries: Record<string, FormEntryValue> = {},
): Promise<T> {
  return postFormResource<T>(path, {
    ...entries,
    image: file,
  });
}
