'use client';

import { Select } from 'orot-ui';
import { useFilterParams } from '@/hooks';
import type { GallerySort } from '@/types';
import { PublicFilterPanel } from '../shared/PublicFilterPanel';
import styles from './PhotosPage.module.css';

interface PhotosPageControlsProps {
  currentSort: GallerySort;
}

const SORT_OPTIONS: Array<{ value: GallerySort; label: string }> = [
  { value: 'manual', label: '정렬' },
  { value: 'takenAtDesc', label: '촬영일 최신순' },
  { value: 'takenAtAsc', label: '촬영일 오래된순' },
  { value: 'createdAtDesc', label: '업로드 최신순' },
];

function normalizeSort(value?: string | null): GallerySort {
  if (value && SORT_OPTIONS.some((option) => option.value === value)) {
    return value as GallerySort;
  }

  return 'manual';
}

export function PhotosPageControls({
  currentSort,
}: PhotosPageControlsProps) {
  const { updateParams } = useFilterParams('/photos');
  const hasResettableFilters = currentSort !== 'manual';

  const handleSort = (value: string | number | null) => {
    const sort = normalizeSort(value != null ? String(value) : undefined);

    updateParams({ sort: sort === 'manual' ? null : sort });
  };

  return (
    <PublicFilterPanel
      hasResettableFilters={hasResettableFilters}
      onReset={() => updateParams({ sort: null })}
      controls={
        <Select
          size="md"
          value={currentSort}
          options={SORT_OPTIONS}
          className={styles.sortSelect}
          onChange={(value) => handleSort(value as string | number | null)}
        />
      }
    />
  );
}
