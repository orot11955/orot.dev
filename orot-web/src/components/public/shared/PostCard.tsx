import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Layers, Tag as TagIcon } from 'lucide-react';
import type { PostListItem } from '@/types';
import { formatDate, resolveAssetUrl, splitTags } from '@/utils/content';
import styles from './PostCard.module.css';

interface PostCardProps {
  post: PostListItem;
  variant?: 'default' | 'compact';
}

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  const tags = splitTags(post.tags).slice(0, 3);
  const cover = resolveAssetUrl(post.coverImage);
  const date = formatDate(post.publishedAt ?? post.createdAt);
  const href = `/posts/${post.slug}`;

  return (
    <Link
      href={href}
      className={[
        styles.card,
        variant === 'compact' ? styles.variantCompact : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {cover ? (
        <div className={styles.cover}>
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 720px) 100vw, 400px"
            className={styles.coverImage}
          />
        </div>
      ) : (
        <div className={[styles.cover, styles.coverPlaceholder].join(' ')}>
          <span>{post.title.slice(0, 1)}</span>
        </div>
      )}

      <div className={styles.body}>
        {(post.category || post.series) && (
          <div className={styles.badgeRow}>
            {post.category && (
              <span className={styles.category}>{post.category.name}</span>
            )}
            {post.series && (
              <span className={styles.series}>
                <Layers size={12} />
                <span className={styles.seriesTitle}>{post.series.title}</span>
                {post.seriesOrder != null && (
                  <span className={styles.seriesOrder}>
                    · {post.seriesOrder}번째
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        <h3 className={styles.title}>{post.title}</h3>

        {post.excerpt && (
          <p className={styles.excerpt}>{post.excerpt}</p>
        )}

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <CalendarDays size={12} />
            {date}
          </span>
          {tags.length > 0 && (
            <span className={styles.metaItem}>
              <TagIcon size={12} />
              {tags.join(' · ')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
