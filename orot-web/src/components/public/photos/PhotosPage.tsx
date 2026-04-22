import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Image as ImageIcon } from 'lucide-react';
import type { GalleryItem, GalleryListResponse, GallerySort } from '@/types';
import { formatDate, resolveAssetUrl } from '@/utils/content';
import { PhotosPageControls } from './PhotosPageControls';
import { PhotosPagination } from './PhotosPagination';
import styles from './PhotosPage.module.css';

interface PhotosPageProps {
  photoList: GalleryListResponse;
  currentSort: GallerySort;
}

export function PhotosPage({ photoList, currentSort }: PhotosPageProps) {
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
        <PhotosPageControls currentSort={currentSort} />
        {photoList.data.length > 0 ? (
          <div className={styles.masonry}>
            {photoList.data.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <ImageIcon size={32} />
            <p>아직 공개된 사진이 없어요.</p>
          </div>
        )}

        {photoList.totalPages > 1 && (
          <div className={styles.pagination}>
            <PhotosPagination
              current={photoList.page}
              total={photoList.total}
              pageSize={photoList.limit}
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
