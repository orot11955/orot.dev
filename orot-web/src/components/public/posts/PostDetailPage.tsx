'use client';

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
  Toc,
} from 'orot-ui';
import type { PostDetail, PostStatus, Series } from '@/types';
import { publicSeriesService } from '@/services/series.service';
import { formatDate, resolveAssetUrl, splitTags } from '@/utils/content';
import { SeriesPanel } from './SeriesPanel';
import { CommentsSection } from './CommentsSection';
import styles from './PostDetailPage.module.css';

interface PostDetailPageProps {
  post: PostDetail;
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

export function PostDetailPage({ post }: PostDetailPageProps) {
  const [series, setSeries] = useState<Series | null>(null);
  const [activeTocId, setActiveTocId] = useState<string>();
  const articleRef = useRef<HTMLElement>(null);
  const tocSlotRef = useRef<HTMLElement>(null);
  const tocPanelRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!post.series) {
      setSeries(null);
      return;
    }
    let cancelled = false;
    publicSeriesService
      .getBySlug(post.series.slug)
      .then((data) => {
        if (!cancelled) setSeries(data);
      })
      .catch(() => {
        if (!cancelled) setSeries(null);
      });
    return () => {
      cancelled = true;
    };
  }, [post.series]);

  const hasSeriesPanel = Boolean(post.series && series);
  const hasTocPanel = tocItems.length > 0;

  useEffect(() => {
    if (!hasTocPanel) {
      setActiveTocId(undefined);
      return;
    }

    let frameId = 0;
    let observer: IntersectionObserver | null = null;

    const setupObserver = () => {
      const headingElements = tocItems
        .map(({ id }) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));

      if (headingElements.length === 0) {
        frameId = window.requestAnimationFrame(setupObserver);
        return;
      }

      setActiveTocId((current) => current ?? headingElements[0].id);

      observer = new IntersectionObserver(
        (entries) => {
          const visibleEntries = entries.filter((entry) => entry.isIntersecting);
          if (visibleEntries.length === 0) {
            return;
          }

          const topmostEntry = visibleEntries.reduce((currentTop, entry) =>
            entry.boundingClientRect.top < currentTop.boundingClientRect.top ? entry : currentTop,
          );

          setActiveTocId(topmostEntry.target.id);
        },
        { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
      );

      headingElements.forEach((element) => {
        observer?.observe(element);
      });
    };

    setupObserver();

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      observer?.disconnect();
    };
  }, [hasTocPanel, tocItems]);

  useEffect(() => {
    const panel = tocPanelRef.current;
    if (!panel || !activeTocId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const activeLink = panel.querySelector<HTMLElement>('.orot-toc__link--active');
      if (!activeLink) {
        return;
      }

      const panelRect = panel.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const linkTop = panel.scrollTop + (linkRect.top - panelRect.top);
      const targetTop = Math.max(
        0,
        linkTop - panel.clientHeight / 2 + activeLink.offsetHeight / 2,
      );
      const maxScrollTop = Math.max(0, panel.scrollHeight - panel.clientHeight);
      const nextScrollTop = Math.min(targetTop, maxScrollTop);

      if (Math.abs(panel.scrollTop - nextScrollTop) < 2) {
        return;
      }

      panel.scrollTo({ top: nextScrollTop, behavior: 'auto' });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeTocId]);

  useEffect(() => {
    const article = articleRef.current;
    const slot = tocSlotRef.current;
    const panel = tocPanelRef.current;

    if (!article || !slot || !panel || !hasTocPanel) {
      return;
    }

    const clearStickyStyles = () => {
      slot.style.height = '';
      panel.style.position = '';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.width = '';
      panel.style.zIndex = '';
    };

    const applyPanelMode = (
      mode: 'static' | 'fixed' | 'absolute',
      topOffset: number,
      slotWidth: number,
      slotLeft: number,
      articleHeight: number,
      panelHeight: number,
    ) => {
      if (mode === 'static') {
        panel.style.position = 'relative';
        panel.style.top = '0';
        panel.style.left = '0';
        panel.style.width = '100%';
        panel.style.zIndex = '';
        return;
      }

      if (mode === 'fixed') {
        panel.style.position = 'fixed';
        panel.style.top = `${topOffset}px`;
        panel.style.left = `${slotLeft}px`;
        panel.style.width = `${slotWidth}px`;
        panel.style.zIndex = '10';
        return;
      }

      panel.style.position = 'absolute';
      panel.style.top = `${Math.max(0, articleHeight - panelHeight)}px`;
      panel.style.left = '0';
      panel.style.width = '100%';
      panel.style.zIndex = '';
    };

    let frameId = 0;

    const updateStickyPosition = () => {
      frameId = 0;

      if (window.innerWidth <= 960) {
        clearStickyStyles();
        return;
      }

      const rootStyles = getComputedStyle(document.documentElement);
      const space6 = parseFloat(rootStyles.getPropertyValue('--orot-space-6')) || 24;
      const topOffset = 64 + space6;
      const slotRect = slot.getBoundingClientRect();
      const articleRect = article.getBoundingClientRect();
      const panelHeight = panel.offsetHeight;
      const articleHeight = article.offsetHeight;
      const slotTop = window.scrollY + slotRect.top;
      const articleBottom = window.scrollY + articleRect.bottom;
      const fixedStart = slotTop - topOffset;
      const fixedEnd = articleBottom - panelHeight - topOffset;

      slot.style.height = `${Math.max(articleHeight, panelHeight)}px`;

      if (window.scrollY <= fixedStart) {
        applyPanelMode(
          'static',
          topOffset,
          slotRect.width,
          slotRect.left,
          articleHeight,
          panelHeight,
        );
        return;
      }

      if (window.scrollY < fixedEnd) {
        applyPanelMode(
          'fixed',
          topOffset,
          slotRect.width,
          slotRect.left,
          articleHeight,
          panelHeight,
        );
        return;
      }

      applyPanelMode(
        'absolute',
        topOffset,
        slotRect.width,
        slotRect.left,
        articleHeight,
        panelHeight,
      );
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateStickyPosition);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    const resizeObserver = new ResizeObserver(() => {
      requestUpdate();
    });

    resizeObserver.observe(article);
    resizeObserver.observe(panel);
    resizeObserver.observe(slot);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      clearStickyStyles();
    };
  }, [hasTocPanel]);

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
          {post.series && series && (
            <div className={styles.panelSlot}>
              <SeriesPanel
                series={post.series}
                posts={series.posts ?? []}
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
            <aside className={styles.tocSlot} aria-label="글 목차 패널" ref={tocSlotRef}>
              <div className={styles.tocPanel} ref={tocPanelRef}>
                <Toc
                  items={tocItems}
                  activeId={activeTocId}
                  title="목차"
                  smooth
                  indent
                  onClick={setActiveTocId}
                  className={styles.toc}
                />
              </div>
            </aside>
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

      {post.status === 'PUBLISHED' && <CommentsSection postId={post.id} />}
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
