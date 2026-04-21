import type { ApiListPayload, PaginatedResponse } from '@/types';

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
