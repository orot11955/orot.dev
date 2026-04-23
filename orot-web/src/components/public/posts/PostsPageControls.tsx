'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
  Hash,
  Layers,
  Search,
  SlidersHorizontal,
  SortDesc,
  Tags,
  X,
} from 'orot-ui';
import type { Category, PostSort, Series } from '@/types';
import styles from './PostsPage.module.css';

interface PostsPageControlsProps {
  series: Series[];
  tags: string[];
  categories: Category[];
  currentSearch: string;
  currentTag: string;
  currentSeries: string;
  currentCategory: string;
  currentSort: PostSort;
  filteredTotal: number;
}

type QueryPatch = {
  search?: string | null;
  tag?: string | null;
  seriesId?: string | null;
  categorySlug?: string | null;
  sort?: PostSort | null;
};

interface FilterToken {
  key: string;
  label: string;
  href: string;
}

interface TagGaugeState {
  visible: boolean;
  width: number;
  offset: number;
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function clean(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function buildPostsHref(
  state: {
    search: string;
    tag: string;
    seriesId: string;
    categorySlug: string;
    sort: PostSort;
  },
  patch: QueryPatch = {},
) {
  const next = {
    search: patch.search === undefined ? state.search : clean(patch.search),
    tag: patch.tag === undefined ? state.tag : clean(patch.tag),
    seriesId:
      patch.seriesId === undefined ? state.seriesId : clean(patch.seriesId),
    categorySlug:
      patch.categorySlug === undefined
        ? state.categorySlug
        : clean(patch.categorySlug),
    sort: patch.sort === undefined ? state.sort : (patch.sort ?? 'latest'),
  };
  const params = new URLSearchParams();

  if (next.search) params.set('search', next.search);
  if (next.tag) params.set('tag', next.tag);
  if (next.seriesId) params.set('seriesId', next.seriesId);
  if (next.categorySlug) params.set('categorySlug', next.categorySlug);
  if (next.sort !== 'latest') params.set('sort', next.sort);

  const query = params.toString();
  return query ? `/posts?${query}` : '/posts';
}

export function PostsPageControls({
  series,
  tags,
  categories,
  currentSearch,
  currentTag,
  currentSeries,
  currentCategory,
  currentSort,
  filteredTotal,
}: PostsPageControlsProps) {
  const router = useRouter();
  const tagScrollerRef = useRef<HTMLDivElement>(null);
  const [keyword, setKeyword] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();
  const [tagGauge, setTagGauge] = useState<TagGaugeState>({
    visible: false,
    width: 0,
    offset: 0,
  });

  const queryState = useMemo(
    () => ({
      search: clean(currentSearch),
      tag: clean(currentTag),
      seriesId: clean(currentSeries),
      categorySlug: clean(currentCategory),
      sort: currentSort,
    }),
    [currentSearch, currentTag, currentSeries, currentCategory, currentSort],
  );

  useEffect(() => {
    setKeyword(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    const scroller = tagScrollerRef.current;

    if (!scroller || tags.length === 0) {
      setTagGauge({ visible: false, width: 0, offset: 0 });
      return;
    }

    let frameId = 0;

    const updateGauge = () => {
      frameId = 0;

      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const visible = maxScroll > 1 && scroller.clientWidth > 0;

      if (!visible) {
        setTagGauge((current) =>
          current.visible ? { visible: false, width: 0, offset: 0 } : current,
        );
        return;
      }

      const ratio = scroller.clientWidth / scroller.scrollWidth;
      const width = Math.max(28, scroller.clientWidth * ratio);
      const maxOffset = Math.max(0, scroller.clientWidth - width);
      const offset = (scroller.scrollLeft / maxScroll) * maxOffset;
      const next = {
        visible: true,
        width: Math.round(width * 100) / 100,
        offset: Math.round(offset * 100) / 100,
      };

      setTagGauge((current) =>
        current.visible === next.visible &&
        current.width === next.width &&
        current.offset === next.offset
          ? current
          : next,
      );
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateGauge);
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(requestUpdate);

    requestUpdate();
    scroller.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    resizeObserver?.observe(scroller);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      scroller.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      resizeObserver?.disconnect();
    };
  }, [tags]);

  const activeSeries = useMemo(
    () => series.find((item) => String(item.id) === queryState.seriesId),
    [series, queryState.seriesId],
  );

  const activeCategory = useMemo(
    () => categories.find((item) => item.slug === queryState.categorySlug),
    [categories, queryState.categorySlug],
  );

  const hasResettableFilters = Boolean(
    queryState.search ||
      queryState.tag ||
      queryState.seriesId ||
      queryState.categorySlug ||
      queryState.sort !== 'latest',
  );

  const navigate = useCallback(
    (patch: QueryPatch) => {
      const href = buildPostsHref(queryState, patch);
      startTransition(() => {
        router.push(href);
      });
    },
    [queryState, router],
  );

  const createHref = useCallback(
    (patch: QueryPatch = {}) => buildPostsHref(queryState, patch),
    [queryState],
  );

  const tokens = useMemo<FilterToken[]>(() => {
    const activeTokens: FilterToken[] = [];

    if (queryState.search) {
      activeTokens.push({
        key: 'search',
        label: `"${queryState.search}"`,
        href: createHref({ search: null }),
      });
    }

    if (queryState.tag) {
      activeTokens.push({
        key: 'tag',
        label: `#${queryState.tag}`,
        href: createHref({ tag: null }),
      });
    }

    if (activeCategory) {
      activeTokens.push({
        key: 'category',
        label: activeCategory.name,
        href: createHref({ categorySlug: null }),
      });
    }

    if (activeSeries) {
      activeTokens.push({
        key: 'series',
        label: activeSeries.title,
        href: createHref({ seriesId: null }),
      });
    }

    if (queryState.sort === 'popular') {
      activeTokens.push({
        key: 'sort',
        label: '인기순',
        href: createHref({ sort: null }),
      });
    }

    return activeTokens;
  }, [activeCategory, activeSeries, createHref, queryState]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ search: keyword.trim() || null });
  };

  const handleSelect =
    (key: 'categorySlug' | 'seriesId') =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      navigate({ [key]: event.target.value || null });
    };

  const handleSort = (sort: PostSort) => {
    navigate({ sort: sort === 'latest' ? null : sort });
  };

  const handleClearDraft = () => {
    setKeyword('');
    if (queryState.search) {
      navigate({ search: null });
    }
  };

  return (
    <section
      className={styles.filterShell}
      data-pending={isPending ? 'true' : 'false'}
      aria-label="글 검색 및 필터"
    >
      <form
        action="/posts"
        method="get"
        role="search"
        className={styles.searchBar}
        onSubmit={handleSearchSubmit}
      >
        {queryState.tag && (
          <input type="hidden" name="tag" value={queryState.tag} />
        )}
        {queryState.seriesId && (
          <input type="hidden" name="seriesId" value={queryState.seriesId} />
        )}
        {queryState.categorySlug && (
          <input
            type="hidden"
            name="categorySlug"
            value={queryState.categorySlug}
          />
        )}
        {queryState.sort !== 'latest' && (
          <input type="hidden" name="sort" value={queryState.sort} />
        )}

        <div className={styles.searchInputWrap}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            name="search"
            value={keyword}
            placeholder="제목, 내용, 태그로 검색"
            autoComplete="off"
            className={styles.searchInput}
            onChange={(event) => setKeyword(event.target.value)}
          />
          {keyword || queryState.search ? (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="검색어 지우기"
              onClick={handleClearDraft}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <button type="submit" className={styles.searchSubmit}>
          <Search size={15} aria-hidden="true" />
          <span>검색</span>
        </button>
      </form>

      <div className={styles.filterGrid}>
        <label className={styles.selectControl}>
          <span className={styles.controlIcon}>
            <Folder size={14} aria-hidden="true" />
          </span>
          <select
            value={queryState.categorySlug}
            aria-label="카테고리"
            onChange={handleSelect('categorySlug')}
          >
            <option value="">모든 카테고리</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectControl}>
          <span className={styles.controlIcon}>
            <Layers size={14} aria-hidden="true" />
          </span>
          <select
            value={queryState.seriesId}
            aria-label="시리즈"
            onChange={handleSelect('seriesId')}
          >
            <option value="">모든 시리즈</option>
            {series.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.sortGroup} aria-label="정렬">
          <SortDesc size={14} aria-hidden="true" />
          <button
            type="button"
            className={styles.sortButton}
            aria-pressed={queryState.sort === 'latest'}
            onClick={() => handleSort('latest')}
          >
            최신순
          </button>
          <button
            type="button"
            className={styles.sortButton}
            aria-pressed={queryState.sort === 'popular'}
            onClick={() => handleSort('popular')}
          >
            인기순
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className={styles.tagRail} aria-label="태그">
          <span className={styles.tagRailLabel}>
            <Tags size={13} aria-hidden="true" />
            TAGS
          </span>
          <div className={styles.tagScrollerWrap}>
            <div ref={tagScrollerRef} className={styles.tagScroller}>
              <Link
                href={createHref({ tag: null })}
                prefetch={false}
                className={cx(
                  styles.tagChip,
                  !queryState.tag && styles.tagChipActive,
                )}
                aria-current={!queryState.tag ? 'true' : undefined}
              >
                전체
              </Link>
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={createHref({ tag })}
                  prefetch={false}
                  className={cx(
                    styles.tagChip,
                    queryState.tag === tag && styles.tagChipActive,
                  )}
                  aria-current={queryState.tag === tag ? 'true' : undefined}
                >
                  <Hash size={12} aria-hidden="true" />
                  {tag}
                </Link>
              ))}
            </div>
            <div
              className={styles.tagScrollGauge}
              data-visible={tagGauge.visible ? 'true' : 'false'}
              aria-hidden="true"
            >
              <span
                className={styles.tagScrollGaugeThumb}
                style={{
                  width: tagGauge.width ? `${tagGauge.width}px` : undefined,
                  transform: `translateX(${tagGauge.offset}px)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.activeFilterRow}>
        <span className={styles.resultBadge}>
          <SlidersHorizontal size={13} aria-hidden="true" />
          결과 {filteredTotal}편
        </span>
        {tokens.map((token) => (
          <Link
            key={token.key}
            href={token.href}
            prefetch={false}
            className={styles.activeToken}
          >
            {token.label}
            <X size={12} aria-hidden="true" />
          </Link>
        ))}
        {hasResettableFilters && (
          <Link href="/posts" prefetch={false} className={styles.resetFilters}>
            <X size={12} aria-hidden="true" />
            필터 초기화
          </Link>
        )}
      </div>

      {activeSeries && (
        <div className={styles.seriesBanner}>
          <div>
            <span className={styles.seriesBannerLabel}>SERIES</span>
            <div className={styles.seriesBannerTitle}>{activeSeries.title}</div>
            {activeSeries.description && (
              <p className={styles.seriesBannerDesc}>{activeSeries.description}</p>
            )}
          </div>
          <Link
            href={createHref({ seriesId: null })}
            prefetch={false}
            className={styles.seriesBannerClose}
          >
            <X size={14} aria-hidden="true" />
            <span>시리즈 해제</span>
          </Link>
        </div>
      )}
    </section>
  );
}
