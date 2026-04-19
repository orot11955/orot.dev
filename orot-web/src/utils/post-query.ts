import type { PostQuery, PostSort, PostStatus } from '@/types';

const VALID_POST_SORTS: PostSort[] = ['latest', 'popular'];
const VALID_POST_STATUSES: PostStatus[] = [
  'DRAFT',
  'COMPLETED',
  'REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'UPDATED',
  'ARCHIVED',
];

function toPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizePostQuery(
  query: Partial<Record<keyof PostQuery, unknown>>,
): PostQuery {
  const normalized: PostQuery = {};

  const page = toPositiveInt(query.page);
  if (page) {
    normalized.page = page;
  }

  const limit = toPositiveInt(query.limit);
  if (limit) {
    normalized.limit = limit;
  }

  const seriesId = toPositiveInt(query.seriesId);
  if (seriesId) {
    normalized.seriesId = seriesId;
  }

  const search = toOptionalString(query.search);
  if (search) {
    normalized.search = search;
  }

  const tag = toOptionalString(query.tag);
  if (tag) {
    normalized.tag = tag;
  }

  const status = toOptionalString(query.status);
  if (status && VALID_POST_STATUSES.includes(status as PostStatus)) {
    normalized.status = status as PostStatus;
  }

  const sort = toOptionalString(query.sort);
  if (sort && VALID_POST_SORTS.includes(sort as PostSort)) {
    normalized.sort = sort as PostSort;
  }

  return normalized;
}

export function normalizePostPage(value: unknown): number {
  return toPositiveInt(value) ?? 1;
}

export function normalizePostSort(value: unknown): PostSort {
  return value === 'popular' ? 'popular' : 'latest';
}
