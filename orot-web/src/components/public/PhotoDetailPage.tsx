'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ImageIcon,
} from 'orot-ui';
import type { GalleryItem } from '@/types';
import { formatDate, resolveAssetUrl } from '@/utils/content';
import styles from './PhotoDetailPage.module.css';

interface PhotoDetailPageProps {
  photo: GalleryItem;
}

export function PhotoDetailPage({ photo }: PhotoDetailPageProps) {
  const src = resolveAssetUrl(photo.imageUrl);
  const title = photo.title || photo.altText || `photo ${photo.id}`;
  const ratio =
    photo.width && photo.height ? `${photo.width} / ${photo.height}` : '3 / 2';

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Link href="/photos" className={styles.back}>
          <ChevronLeft size={14} /> 갤러리로 돌아가기
        </Link>

        <div className={styles.layout}>
          <figure className={styles.figure} style={{ aspectRatio: ratio }}>
            {src ? (
              <Image
                src={src}
                alt={photo.altText || title}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 860px"
                className={styles.image}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                <ImageIcon size={48} />
              </div>
            )}
          </figure>

          <aside className={styles.meta} aria-label="사진 정보">
            <span className={styles.eyebrow}>PHOTO</span>
            <h1 className={styles.title}>{title}</h1>

            {photo.description && (
              <p className={styles.desc}>{photo.description}</p>
            )}

            <dl className={styles.props}>
              {photo.takenAt && (
                <PropRow label="촬영일">
                  <CalendarDays size={12} /> {formatDate(photo.takenAt)}
                </PropRow>
              )}
              {photo.width && photo.height && (
                <PropRow label="크기">
                  {photo.width} × {photo.height}
                </PropRow>
              )}
              {photo.altText && (
                <PropRow label="Alt">{photo.altText}</PropRow>
              )}
              <PropRow label="등록일">{formatDate(photo.createdAt)}</PropRow>
            </dl>

            {src && (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.originalLink}
              >
                원본 파일 열기 <ArrowUpRight size={12} />
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function PropRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.propRow}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
