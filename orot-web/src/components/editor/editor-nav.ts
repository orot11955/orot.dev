import type { PostStatus } from '@/types';

export type EditorFilter = 'all' | PostStatus;

export const EDITOR_VISIBLE_STATUSES: PostStatus[] = [
  'DRAFT',
  'COMPLETED',
  'REVIEW',
  'UPDATED',
];

export const EDITOR_FILTERS: { value: EditorFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'DRAFT', label: '초안' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'REVIEW', label: '검토' },
  { value: 'UPDATED', label: '수정중' },
];
