'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import {
  FileText,
  Filter,
  Pagination,
  Search,
  Segmented,
  Select,
  X,
} from 'orot-ui';
import type { PostListResponse, PostSort, Series } from '@/types';
import { PostCard } from './PostCard';
import styles from './PostsPage.module.css';

interface PostsPageProps {
  postList: PostListResponse;
  overallTotal: number;
  series: Series[];
  tags: string[];
}

export function PostsPage({
  postList,
  overallTotal,
  series,
  tags,
}: PostsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('search') ?? '';
  const currentTag = searchParams.get('tag') ?? '';
  const currentSeries = searchParams.get('seriesId') ?? '';
  const currentSort = (searchParams.get('sort') as PostSort) ?? 'latest';

  const [keyword, setKeyword] = useState(currentSearch);

  const activeSeries = useMemo(
    () => series.find((s) => String(s.id) === currentSeries),
    [series, currentSeries],
  );

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    });
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `/posts?${qs}` : '/posts');
  };

  const handlePage = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    const qs = next.toString();
    router.push(qs ? `/posts?${qs}` : '/posts');
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateParams({ search: keyword.trim() || null });
  };

  const hasFilters = Boolean(
    currentSearch || currentTag || currentSeries || currentSort !== 'latest',
  );
  const hasResettableFilters = Boolean(
    currentSearch || currentTag || currentSeries,
  );

  const sortOptions = [
    { label: '최신순', value: 'latest' },
    { label: '인기순', value: 'popular' },
  ];

  const seriesOptions = [
    { label: '모든 시리즈', value: '' },
    ...series.map((s) => ({ label: s.title, value: String(s.id) })),
  ];

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* ─── Header ─── */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.eyebrow}>POSTS</span>
            <h1 className={styles.title}>글</h1>
          </div>
          <p className={styles.subtitle}>
            전체 <strong>{overallTotal}</strong>편의 글을 읽어보세요.
          </p>
        </header>

        {/* ─── Filters ─── */}
        <div className={styles.filters}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchInputWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="제목, 내용으로 검색"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              {keyword && (
                <button
                  type="button"
                  className={styles.searchClear}
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setKeyword('');
                    updateParams({ search: null });
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </form>

          <div className={styles.filterControls}>
            <Select
              size="md"
              value={currentSeries || ''}
              onChange={(val) => updateParams({ seriesId: String(val) || null })}
              options={seriesOptions}
              placeholder="시리즈"
              className={styles.select}
            />

            <button
              type="button"
              className={[
                styles.reset,
                !hasResettableFilters ? styles.resetHidden : '',
              ].join(' ')}
              onClick={() => router.push('/posts')}
              disabled={!hasResettableFilters}
              aria-hidden={!hasResettableFilters}
              tabIndex={hasResettableFilters ? 0 : -1}
            >
              <X size={12} /> 필터 초기화
            </button>
          </div>
        </div>

        {/* ─── Tags chip row ─── */}
        {tags.length > 0 && (
          <div className={styles.tagRow}>
            <span className={styles.tagRowLabel}>
              <Filter size={12} /> 태그
            </span>
            <div className={styles.tagScroll}>
              <button
                type="button"
                onClick={() => updateParams({ tag: null })}
                className={[
                  styles.tagChip,
                  !currentTag ? styles.tagChipActive : '',
                ].join(' ')}
              >
                전체
              </button>
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateParams({ tag: t })}
                  className={[
                    styles.tagChip,
                    currentTag === t ? styles.tagChipActive : '',
                  ].join(' ')}
                >
                  #{t}
                </button>
              ))}
            </div>
            <div className={styles.tagSort}>
              <Segmented
                size="sm"
                value={currentSort}
                onChange={(val) =>
                  updateParams({ sort: val === 'latest' ? null : String(val) })
                }
                options={sortOptions}
              />
            </div>
          </div>
        )}

        {tags.length === 0 && (
          <div className={styles.sortRow}>
            <Segmented
              size="sm"
              value={currentSort}
              onChange={(val) =>
                updateParams({ sort: val === 'latest' ? null : String(val) })
              }
              options={sortOptions}
            />
          </div>
        )}

        {/* ─── Active series banner ─── */}
        {activeSeries && (
          <div className={styles.seriesBanner}>
            <div>
              <span className={styles.seriesBannerLabel}>SERIES</span>
              <div className={styles.seriesBannerTitle}>
                {activeSeries.title}
              </div>
              {activeSeries.description && (
                <p className={styles.seriesBannerDesc}>
                  {activeSeries.description}
                </p>
              )}
            </div>
            <button
              type="button"
              className={styles.seriesBannerClose}
              onClick={() => updateParams({ seriesId: null })}
            >
              <X size={14} />
              <span>시리즈 해제</span>
            </button>
          </div>
        )}

        {/* ─── List ─── */}
        {postList.data.length > 0 ? (
          <div className={styles.list}>
            {postList.data.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <FileText size={32} />
            <p>조건에 맞는 글이 없어요.</p>
            {hasFilters && (
              <Link href="/posts" className={styles.emptyLink}>
                필터 초기화
              </Link>
            )}
          </div>
        )}

        {/* ─── Pagination ─── */}
        {postList.totalPages > 1 && (
          <div className={styles.pagination}>
            <Pagination
              current={postList.page}
              total={postList.total}
              pageSize={postList.limit}
              onChange={handlePage}
              align="center"
              hideOnSinglePage
            />
          </div>
        )}
      </div>
    </div>
  );
}
