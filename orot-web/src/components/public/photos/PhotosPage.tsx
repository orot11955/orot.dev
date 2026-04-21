'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Flex, ImageIcon, Masonry, Pagination, Select } from 'orot-ui';
import type { GalleryItem, GalleryListResponse, GallerySort } from '@/types';
import { formatDate, resolveAssetUrl } from '@/utils/content';
import styles from './PhotosPage.module.css';

interface PhotosPageProps {
  photoList: GalleryListResponse;
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

export function PhotosPage({ photoList, currentSort }: PhotosPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePage = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    const qs = next.toString();
    router.push(qs ? `/photos?${qs}` : '/photos');
  };

  const handleSort = (value: string | number | null) => {
    const next = new URLSearchParams(searchParams.toString());
    const sort = normalizeSort(value != null ? String(value) : undefined);

    if (sort === 'manual') next.delete('sort');
    else next.set('sort', sort);

    next.delete('page');

    const qs = next.toString();
    router.push(qs ? `/photos?${qs}` : '/photos');
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>PHOTOS</span>
          <h1 className={styles.title}>갤러리</h1>
          <p className={styles.subtitle}>
            총 <strong>{photoList.total}</strong>장의 사진을 모아두었어요.
          </p>
        </header>
        <Flex justify='end'>
          <Select
            size="md"
            value={currentSort}
            options={SORT_OPTIONS}
            className={styles.sortSelect}
            onChange={(value) => handleSort(value as string | number | null)}
          />
        </Flex>
        {photoList.data.length > 0 ? (
          <Masonry
            columns={{ xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
            gap={16}
            className={styles.masonry}
          >
            {photoList.data.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} />
            ))}
          </Masonry>
        ) : (
          <div className={styles.empty}>
            <ImageIcon size={32} />
            <p>아직 공개된 사진이 없어요.</p>
          </div>
        )}

        {photoList.totalPages > 1 && (
          <div className={styles.pagination}>
            <Pagination
              current={photoList.page}
              total={photoList.total}
              pageSize={photoList.limit}
              align="center"
              hideOnSinglePage
              onChange={handlePage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoTile({ photo }: { photo: GalleryItem }) {
  const src =
    resolveAssetUrl(photo.thumbnailUrl) || resolveAssetUrl(photo.imageUrl);
  const alt = photo.altText || photo.title || `photo-${photo.id}`;
  const ratio =
    photo.width && photo.height
      ? `${photo.width} / ${photo.height}`
      : '4 / 5';

  return (
    <Link href={`/photos/${photo.id}`} className={styles.tile}>
      <div className={styles.tileMedia} style={{ aspectRatio: ratio }}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
            className={styles.tileImage}
          />
        ) : (
          <div className={styles.tilePlaceholder}>
            <ImageIcon size={24} />
          </div>
        )}
        <div className={styles.tileOverlay}>
          <div className={styles.tileOverlayInner}>
            {photo.title && (
              <span className={styles.tileTitle}>{photo.title}</span>
            )}
            {photo.takenAt && (
              <span className={styles.tileDate}>
                <CalendarDays size={11} /> {formatDate(photo.takenAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
