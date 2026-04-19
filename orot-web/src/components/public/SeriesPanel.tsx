'use client';

import Link from 'next/link';
import { Layers } from 'orot-ui';
import type { SeriesPostSummary, SeriesSummary } from '@/types';
import styles from './SeriesPanel.module.css';

interface SeriesPanelProps {
  series: SeriesSummary;
  posts: SeriesPostSummary[];
  currentSlug: string;
}

export function SeriesPanel({ series, posts, currentSlug }: SeriesPanelProps) {
  return (
    <aside className={styles.panel} aria-label={`시리즈: ${series.title}`}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          <Layers size={12} /> SERIES
        </span>
        <Link href={`/posts?seriesId=${series.id}`} className={styles.title}>
          {series.title}
        </Link>
        <span className={styles.count}>{posts.length}편 연재중</span>
      </header>

      <ol className={styles.list}>
        {posts.map((p, idx) => {
          const active = p.slug === currentSlug;
          return (
            <li
              key={p.id}
              className={[styles.item, active ? styles.itemActive : ''].join(' ')}
            >
              <Link href={`/posts/${p.slug}`} className={styles.link}>
                <span className={styles.index}>{idx + 1}</span>
                <span className={styles.label}>{p.title}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
