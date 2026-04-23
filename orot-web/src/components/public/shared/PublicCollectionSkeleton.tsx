import type { CSSProperties } from 'react';
import styles from './PublicCollectionSkeleton.module.css';

interface PublicCollectionSkeletonProps {
  variant: 'posts' | 'photos';
}

interface SkeletonBlockProps {
  className?: string;
  style?: CSSProperties;
}

const POST_CARD_COUNT = 6;
const PHOTO_TILE_HEIGHTS = [320, 260, 360, 300, 380, 280, 340, 300];

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function SkeletonBlock({ className, style }: SkeletonBlockProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(styles.skeletonBlock, className)}
      style={style}
    />
  );
}

export function PublicCollectionSkeleton({
  variant,
}: PublicCollectionSkeletonProps) {
  if (variant === 'photos') {
    return <PhotosCollectionSkeleton />;
  }

  return <PostsCollectionSkeleton />;
}

function SkeletonHeader() {
  return (
    <div className={styles.header}>
      <SkeletonBlock className={styles.eyebrow} />
      <SkeletonBlock className={styles.title} />
      <SkeletonBlock className={styles.subtitle} />
    </div>
  );
}

function PostsCollectionSkeleton() {
  return (
    <div className={styles.shell} role="status" aria-label="Loading posts">
      <span className={styles.srOnly}>Loading posts</span>
      <SkeletonHeader />

      <div className={styles.toolbar}>
        <SkeletonBlock className={styles.toolbarSearch} />
        <div className={styles.toolbarControls}>
          <SkeletonBlock className={styles.toolbarSelect} />
          <SkeletonBlock className={styles.toolbarSelect} />
          <SkeletonBlock className={styles.toolbarSort} />
        </div>
      </div>

      <div className={styles.chipRows} aria-hidden="true">
        <div className={styles.chipRow}>
          <SkeletonBlock className={styles.chipWide} />
          <SkeletonBlock className={styles.chip} />
          <SkeletonBlock className={styles.chipWide} />
          <SkeletonBlock className={styles.chip} />
          <SkeletonBlock className={styles.chipWide} />
        </div>
        <div className={styles.chipRow}>
          <SkeletonBlock className={styles.chip} />
          <SkeletonBlock className={styles.chipWide} />
          <SkeletonBlock className={styles.chip} />
          <SkeletonBlock className={styles.chipWide} />
          <SkeletonBlock className={styles.chip} />
        </div>
      </div>

      <div className={styles.postsGrid}>
        {Array.from({ length: POST_CARD_COUNT }, (_, index) => (
          <article key={`post-skeleton-${index}`} className={styles.postCard}>
            <div className={styles.postCardMediaWrap}>
              <SkeletonBlock className={styles.postCardMedia} />
              <span className={styles.mediaAccent} aria-hidden="true" />
            </div>
            <div className={styles.postCardBody}>
              <div className={styles.postBadgeRow}>
                <SkeletonBlock className={styles.postBadge} />
                <SkeletonBlock className={styles.postBadgeSecondary} />
              </div>
              <div className={styles.postTextStack}>
                <SkeletonBlock className={styles.postTitleLine} />
                <SkeletonBlock className={styles.postExcerptLine} />
                <SkeletonBlock className={styles.postExcerptShort} />
              </div>
              <SkeletonBlock className={styles.postMeta} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PhotosCollectionSkeleton() {
  return (
    <div className={styles.shell} role="status" aria-label="Loading photos">
      <span className={styles.srOnly}>Loading photos</span>
      <SkeletonHeader />

      <div className={styles.toolbar}>
        <div className={styles.toolbarSpacer} />
        <div className={styles.toolbarControls}>
          <SkeletonBlock className={styles.photoToolbarSelect} />
        </div>
      </div>

      <div className={styles.photosMasonry}>
        {PHOTO_TILE_HEIGHTS.map((height, index) => (
          <div key={`photo-skeleton-${index}`} className={styles.photoTile}>
            <SkeletonBlock
              className={styles.photoTileMedia}
              style={{ height }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
