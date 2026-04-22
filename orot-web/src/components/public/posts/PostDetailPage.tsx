'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Hash,
  MarkdownEditor,
} from 'orot-ui';
import type { PostDetail, PostStatus, Series, SeriesPostSummary } from '@/types';
import { publicSeriesService } from '@/services/series.service';
import { formatDate, resolveAssetUrl, splitTags } from '@/utils/content';
import { SeriesPanel } from './SeriesPanel';
import styles from './PostDetailPage.module.css';

interface PostDetailPageProps {
  post: PostDetail;
  initialSeries: Series | null;
}

interface MarkdownHeading {
  id: string;
  lineIndex: number;
  level: number;
  text: string;
}

const TOC_MAX_DEPTH = 3;
const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: '초안',
  COMPLETED: '작성 완료',
  REVIEW: '검토',
  SCHEDULED: '예약 발행',
  PUBLISHED: '발행',
  UPDATED: '수정 중',
  ARCHIVED: '보관',
};

const DeferredCommentsSection = dynamic(
  () => import('./CommentsSection').then((mod) => mod.CommentsSection),
  {
    loading: () => (
      <div className={styles.commentsFallback}>댓글을 준비하는 중...</div>
    ),
  },
);

const DeferredTocPanel = dynamic(
  () => import('./PostDetailTocPanel').then((mod) => mod.PostDetailTocPanel),
  {
    loading: () => (
      <aside className={styles.tocSlot} aria-hidden="true">
        <div className={styles.tocPanel} />
      </aside>
    ),
  },
);

export function PostDetailPage({ post, initialSeries }: PostDetailPageProps) {
  const articleRef = useRef<HTMLElement>(null);
  const tags = splitTags(post.tags);
  const cover = resolveAssetUrl(post.coverImage);
  const published = formatDate(post.publishedAt ?? post.createdAt);
  const headings = useMemo(() => extractMarkdownHeadings(post.content), [post.content]);
  const tocItems = useMemo(
    () =>
      headings
        .filter((heading) => heading.level <= TOC_MAX_DEPTH)
        .map(({ id, level, text }) => ({ id, level, text })),
    [headings],
  );
  const initialSeriesPosts =
    initialSeries && initialSeries.slug === post.series?.slug
      ? (initialSeries.posts ?? [])
      : null;
  const [seriesPosts, setSeriesPosts] =
    useState<SeriesPostSummary[] | null>(initialSeriesPosts);

  useEffect(() => {
    if (!post.series) {
      setSeriesPosts(null);
      return;
    }

    if (initialSeries?.slug === post.series.slug) {
      setSeriesPosts(initialSeries.posts ?? []);
      return;
    }

    let cancelled = false;
    publicSeriesService
      .getBySlug(post.series.slug)
      .then((data) => {
        if (!cancelled) setSeriesPosts(data.posts ?? []);
      })
      .catch(() => {
        if (!cancelled) setSeriesPosts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [initialSeries, post.series]);

  const hasSeriesPanel = Boolean(post.series && seriesPosts);
  const hasTocPanel = tocItems.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div
          className={[
            styles.contentGrid,
            hasSeriesPanel ? styles.contentGridWithSeries : '',
            hasTocPanel ? styles.contentGridWithToc : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {post.series && seriesPosts && (
            <div className={styles.panelSlot}>
              <SeriesPanel
                series={post.series}
                posts={seriesPosts ?? []}
                currentSlug={post.slug}
              />
            </div>
          )}

          <Article
            post={post}
            cover={cover}
            published={published}
            headings={headings}
            tags={tags}
            articleRef={articleRef}
          />

          {hasTocPanel && (
            <DeferredTocPanel articleRef={articleRef} tocItems={tocItems} />
          )}
        </div>
      </div>
    </div>
  );
}

interface ArticleProps {
  post: PostDetail;
  cover: string;
  published: string;
  headings: MarkdownHeading[];
  tags: string[];
  articleRef: RefObject<HTMLElement | null>;
}

function Article({ post, cover, published, headings, tags, articleRef }: ArticleProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const isPreview = post.status !== 'PUBLISHED';
  const statusLabel = STATUS_LABELS[post.status];

  useLayoutEffect(() => {
    const editorRoot = bodyRef.current?.querySelector<HTMLElement>('.orot-md-content');
    if (!editorRoot) {
      return;
    }

    editorRoot
      .querySelectorAll<HTMLElement>('[data-heading-id]')
      .forEach((heading) => {
        heading.removeAttribute('id');
        heading.removeAttribute('data-heading-id');
        heading.removeAttribute('tabindex');
      });

    const headingElements = Array.from(
      editorRoot.querySelectorAll<HTMLElement>(
        '.orot-md-line.orot-md-h1, .orot-md-line.orot-md-h2, .orot-md-line.orot-md-h3, .orot-md-line.orot-md-h4, .orot-md-line.orot-md-h5, .orot-md-line.orot-md-h6',
      ),
    );

    headings.forEach(({ id }, index) => {
      const heading = headingElements[index];

      if (!heading) {
        return;
      }

      heading.id = id;
      heading.dataset.headingId = id;
      heading.tabIndex = -1;
    });
  }, [headings, post.content]);

  return (
    <article className={styles.article} ref={articleRef}>
      <Link href="/posts" className={styles.backLink}>
        <ChevronLeft size={14} /> 글 목록
      </Link>

      <header className={styles.header}>
        {isPreview && (
          <div className={styles.previewNotice}>
            <span className={styles.previewLabel}>STAFF PREVIEW</span>
            <span className={styles.previewText}>
              이 글은 현재 {statusLabel} 상태이며 아직 공개되지 않았습니다.
            </span>
          </div>
        )}
        {post.series && (
          <Link
            href={`/posts?seriesId=${post.series.id}`}
            className={styles.seriesBadge}
          >
            {post.series.title}
            <ArrowUpRight size={12} />
          </Link>
        )}
        <h1 className={styles.title}>{post.title}</h1>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <CalendarDays size={14} /> {published}
          </span>
          <span className={styles.metaItem}>
            <Eye size={14} /> {post.viewCount.toLocaleString('ko-KR')}
          </span>
        </div>
      </header>

      {cover && (
        <figure className={styles.cover}>
          <Image
            src={cover}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 860px) 100vw, 860px"
            className={styles.coverImage}
          />
        </figure>
      )}

      <div className={styles.body} ref={bodyRef}>
        <MarkdownEditor
          value={post.content}
          placeholder="본문이 없습니다."
          readOnly
          showToolbar={false}
          showFloatingToolbar={false}
          showWordCount={false}
          minHeight={0}
          className={styles.markdownBody}
        />
      </div>

      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/posts?tag=${encodeURIComponent(tag)}`}
              className={styles.tag}
            >
              <Hash size={12} /> {tag}
            </Link>
          ))}
        </div>
      )}

      {post.series && (post.prev || post.next) && (
        <nav className={styles.neighbors} aria-label="이전/다음 글">
          {post.prev ? (
            <Link
              href={`/posts/${post.prev.slug}`}
              className={[styles.neighbor, styles.neighborPrev].join(' ')}
            >
              <ChevronLeft size={14} />
              <span className={styles.neighborLabel}>이전 글</span>
              <span className={styles.neighborTitle}>{post.prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {post.next ? (
            <Link
              href={`/posts/${post.next.slug}`}
              className={[styles.neighbor, styles.neighborNext].join(' ')}
            >
              <span className={styles.neighborLabel}>다음 글</span>
              <span className={styles.neighborTitle}>{post.next.title}</span>
              <ChevronRight size={14} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {post.status === 'PUBLISHED' && (
        <DeferredCommentsSection postId={post.id} />
      )}
    </article>
  );
}

function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const slugCounts = new Map<string, number>();

  markdown.split('\n').forEach((line, lineIndex) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (!match) {
      return;
    }

    const level = match[1].length;
    const text = stripHeadingMarkdown(match[2]);
    const baseSlug = slugifyHeading(text);
    const count = (slugCounts.get(baseSlug) ?? 0) + 1;
    const suffix = count > 1 ? `-${count - 1}` : '';

    slugCounts.set(baseSlug, count);

    headings.push({
      id: `post-heading-${baseSlug}${suffix}`,
      lineIndex,
      level,
      text,
    });
  });

  return headings;
}

function stripHeadingMarkdown(value: string): string {
  const stripped = value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .trim();

  return stripped || '섹션';
}

function slugifyHeading(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return slug || 'section';
}
