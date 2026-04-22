'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from 'orot-ui';
import type { GallerySort } from '@/types';
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (value: string | number | null) => {
    const next = new URLSearchParams(searchParams.toString());
    const sort = normalizeSort(value != null ? String(value) : undefined);

    if (sort === 'manual') {
      next.delete('sort');
    } else {
      next.set('sort', sort);
    }

    next.delete('page');

    const queryString = next.toString();
    router.push(queryString ? `/photos?${queryString}` : '/photos');
  };

  return (
    <div className={styles.toolbar}>
      <Select
        size="md"
        value={currentSort}
        options={SORT_OPTIONS}
        className={styles.sortSelect}
        onChange={(value) => handleSort(value as string | number | null)}
      />
    </div>
  );
}
