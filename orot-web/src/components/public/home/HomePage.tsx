"use client";

import Link from 'next/link';
import {
  ArrowUpRight,
  Hash,
  Layers,
  ExternalLink,
} from 'lucide-react';
import type {
  GalleryItem,
  PostListItem,
  PublicSettings,
  Series,
} from '@/types';
import { resolveAssetUrl } from '@/utils/content';
import { parseGlobalLinks } from '@/layouts/public/public-navigation';
import { HomeHeroActions } from './HomeHeroActions';
import { HomeHeroImage } from './HomeHeroImage';
import { HomePostCard } from './HomePostCard';
import styles from './HomePage.module.css';

interface HomePageProps {
  posts: PostListItem[];
  photos: GalleryItem[];
  photoTotal: number;
  series: Series[];
  tags: string[];
  settings: PublicSettings | null;
  configuredHeroPhoto: GalleryItem | null;
}

export function HomePage({
  posts,
  photos,
  series,
  tags,
  settings,
  configuredHeroPhoto,
}: HomePageProps) {
  const siteName = settings?.site_name?.trim() || 'orot.dev';
  const siteDesc =
    settings?.site_description?.trim() || '개발, 사진, 그리고 기록';

  const configuredHeroUrl = resolveAssetUrl(settings?.home_hero_image);
  const autoHeroPhoto = configuredHeroUrl ? null : photos[0];
  const heroPhoto = configuredHeroPhoto ?? autoHeroPhoto ?? null;
  const heroUrl =
    configuredHeroUrl ||
    resolveAssetUrl(heroPhoto?.imageUrl) ||
    resolveAssetUrl(settings?.site_og_image);
  const heroPreviewUrl =
    resolveAssetUrl(heroPhoto?.thumbnailUrl) || null;
  const heroAlt =
    heroPhoto?.altText ||
    heroPhoto?.title ||
    (configuredHeroUrl ? `${siteName} 메인 이미지` : `${siteName} 대표 이미지`);
  const heroY = settings?.home_hero_image_position_y || '50%';

  const ongoingSeries = series.slice(0, 4);
  const topTags = tags.slice(0, 18);
  const external = parseGlobalLinks(settings);

  return (
    <div className={styles.page}>
      {/* ─── Hero ─── */}
      <section className={styles.hero}>
        <div className={styles.heroMedia}>
          {heroUrl ? (
            <HomeHeroImage
              src={heroUrl}
              previewSrc={heroPreviewUrl}
              alt={heroAlt}
              objectPosition={`0 ${heroY}`}
            />
          ) : (
            <div className={styles.heroPlaceholder} />
          )}
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>WELCOME</span>
          <h1 className={styles.heroTitle}>{siteName}</h1>
          <p className={styles.heroDesc}>{siteDesc}</p>
          <HomeHeroActions />
        </div>
      </section>

      <div className={styles.shell}>
        {/* ─── Ongoing series ─── */}
        {ongoingSeries.length > 0 && (
          <section className={styles.section}>
            <SectionHeader
              eyebrow="SERIES"
              title="연재중인 시리즈"
              moreHref="/posts"
              moreLabel="모든 글 보기"
            />
            <div className={styles.seriesGrid}>
              {ongoingSeries.map((s) => (
                <Link
                  key={s.id}
                  href={`/posts?seriesId=${s.id}`}
                  className={styles.seriesCard}
                >
                  <div className={styles.seriesCardTop}>
                    <Layers size={14} />
                    <span>{s._count?.posts ?? 0}편</span>
                  </div>
                  <h3 className={styles.seriesCardTitle}>{s.title}</h3>
                  {s.description && (
                    <p className={styles.seriesCardDesc}>{s.description}</p>
                  )}
                  <span className={styles.seriesCardMore}>
                    계속 읽기 <ArrowUpRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Featured posts ─── */}
        <section className={styles.section}>
          <SectionHeader
            eyebrow="RECENT"
            title="최근 글"
            moreHref="/posts"
            moreLabel="전체 보기"
          />
          {posts.length > 0 ? (
            <div className={styles.postsGrid}>
              {posts.map((p) => (
                <HomePostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <EmptyBlock message="아직 발행된 글이 없어요" />
          )}
        </section>

        {/* ─── Tags + External ─── */}
        <section className={styles.twoCol}>
          <div className={styles.colBlock}>
            <SectionHeader
              eyebrow="TAGS"
              title="많이 사용된 태그"
              inline
            />
            {topTags.length > 0 ? (
              <div className={styles.tagCloud}>
                {topTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/posts?tag=${encodeURIComponent(tag)}`}
                    className={styles.tagChip}
                  >
                    <Hash size={12} />
                    <span>{tag}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyBlock message="아직 태그가 없어요" compact />
            )}
          </div>

          <div className={styles.colBlock}>
            <SectionHeader
              eyebrow="LINKS"
              title="외부 링크"
              inline
            />
            {external.length > 0 ? (
              <ul className={styles.linkList}>
                {external.map((link) => (
                  <li key={`${link.label}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkRow}
                    >
                      <ExternalLink size={14} />
                      <span className={styles.linkLabel}>{link.label}</span>
                      <ArrowUpRight size={14} className={styles.linkArrow} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyBlock message="등록된 외부 링크가 없어요" compact />
            )}
          </div>
        </section>

        {/* ─── Working on ───
        {posts.length > 0 && (
          <section className={styles.section}>
            <SectionHeader
              eyebrow="NOW"
              title="현재 작업중"
              hint="가장 최근 업데이트된 글"
            />
            <div className={styles.nowGrid}>
              {posts.slice(0, 3).map((p) => (
                <Link
                  key={`now-${p.id}`}
                  href={`/posts/${p.slug}`}
                  className={styles.nowCard}
                >
                  <div className={styles.nowMeta}>
                    <CalendarDays size={12} />
                    {formatDate(p.updatedAt ?? p.publishedAt)}
                  </div>
                  <h3 className={styles.nowTitle}>{p.title}</h3>
                  {p.excerpt && <p className={styles.nowDesc}>{p.excerpt}</p>}
                  <div className={styles.nowTags}>
                    {splitTags(p.tags).slice(0, 4).map((t) => (
                      <span key={t} className={styles.nowTag}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )} */}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  hint?: string;
  moreHref?: string;
  moreLabel?: string;
  inline?: boolean;
}

function SectionHeader({
  eyebrow,
  title,
  hint,
  moreHref,
  moreLabel,
  inline,
}: SectionHeaderProps) {
  return (
    <div className={[styles.sectionHeader, inline ? styles.sectionHeaderInline : ''].join(' ')}>
      <div className={styles.sectionHeadText}>
        <span className={styles.sectionEyebrow}>{eyebrow}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {hint && <span className={styles.sectionHint}>{hint}</span>}
      </div>
      {moreHref && moreLabel && (
        <Link href={moreHref} className={styles.sectionMore}>
          {moreLabel}
          <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

function EmptyBlock({
  message,
  compact,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[styles.empty, compact ? styles.emptyCompact : ''].join(' ')}
    >
      {message}
    </div>
  );
}
