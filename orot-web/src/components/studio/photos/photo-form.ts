import type {
  CreateGalleryItemPayload,
  GalleryItem,
  UpdateGalleryItemPayload,
} from '@/types';

export interface PhotoFormState {
  title: string;
  description: string;
  altText: string;
  takenAt: string;
  sortOrder: string;
}

interface BuildCreatePhotoPayloadOptions {
  fallbackSortOrder?: number;
  clearEmptyTakenAt?: false;
}

interface BuildUpdatePhotoPayloadOptions {
  fallbackSortOrder?: number;
  clearEmptyTakenAt?: boolean;
}

export function toPhotoDateInputValue(value?: string | null): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildPhotoFormState(
  item: Pick<GalleryItem, 'title' | 'description' | 'altText' | 'takenAt' | 'sortOrder'> | null,
): PhotoFormState {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    altText: item?.altText ?? '',
    takenAt: toPhotoDateInputValue(item?.takenAt),
    sortOrder: item?.sortOrder != null ? String(item.sortOrder) : '0',
  };
}

export function buildPhotoPayload(
  form: PhotoFormState,
  options: BuildUpdatePhotoPayloadOptions & { clearEmptyTakenAt: true },
): UpdateGalleryItemPayload;
export function buildPhotoPayload(
  form: PhotoFormState,
  options?: BuildCreatePhotoPayloadOptions,
): CreateGalleryItemPayload;
export function buildPhotoPayload(
  form: PhotoFormState,
  { fallbackSortOrder, clearEmptyTakenAt }: BuildUpdatePhotoPayloadOptions = {},
): CreateGalleryItemPayload | UpdateGalleryItemPayload {
  const parsedSortOrder = Number.parseInt(form.sortOrder, 10);
  const takenAt = form.takenAt
    ? new Date(form.takenAt).toISOString()
    : clearEmptyTakenAt
      ? null
      : undefined;

  return {
    title: form.title || undefined,
    description: form.description || undefined,
    altText: form.altText || undefined,
    takenAt,
    sortOrder: Number.isNaN(parsedSortOrder) ? fallbackSortOrder : parsedSortOrder,
  };
}
