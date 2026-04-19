'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import {
  FileText,
  Input,
  Pagination,
  Search,
  Segmented,
  Select,
  X,
} from 'orot-ui';
import type {
  Category,
  PostListResponse,
  PostSort,
  Series,
} from '@/types';
import { PostCard } from './PostCard';
import styles from './PostsPage.module.css';

interface PostsPageProps {
  postList: PostListResponse;
  overallTotal: number;
  series: Series[];
  tags: string[];
  categories: Category[];
}

export function PostsPage({
  postList,
  overallTotal,
  series,
  tags,
  categories,
}: PostsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('search') ?? '';
  const currentTag = searchParams.get('tag') ?? '';
  const currentSeries = searchParams.get('seriesId') ?? '';
  const currentCategory = searchParams.get('categorySlug') ?? '';
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
    currentSearch ||
      currentTag ||
      currentSeries ||
      currentCategory ||
      currentSort !== 'latest',
  );
  const hasResettableFilters = Boolean(
    currentSearch || currentTag || currentSeries || currentCategory,
  );

  const sortOptions = [
    { label: '최신순', value: 'latest' },
    { label: '인기순', value: 'popular' },
  ];

  const seriesOptions = [
    { label: '모든 시리즈', value: '' },
    ...series.map((s) => ({ label: s.title, value: String(s.id) })),
  ];

  const categoryOptions = [
    { label: '모든 카테고리', value: '' },
    ...categories.map((c) => ({ label: c.name, value: c.slug })),
  ];

  const sortSegmented = (
    <Segmented
      size="sm"
      value={currentSort}
      onChange={(val) =>
        updateParams({ sort: val === 'latest' ? null : String(val) })
      }
      options={sortOptions}
    />
  );

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

        {/* ─── Toolbar ─── */}
        <div className={styles.toolbar}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <Input
              type="search"
              size="md"
              prefix={<Search size={14} />}
              placeholder="제목, 내용으로 검색"
              value={keyword}
              onChange={(e) => {
                const next = e.target.value;
                setKeyword(next);
                if (next === '' && currentSearch) updateParams({ search: null });
              }}
              allowClear
              className={styles.search}
            />
          </form>

          <div className={styles.toolbarControls}>
            <Select
              size="md"
              value={currentCategory || ''}
              onChange={(val) =>
                updateParams({ categorySlug: String(val) || null })
              }
              options={categoryOptions}
              placeholder="카테고리"
              className={styles.select}
            />
            <Select
              size="md"
              value={currentSeries || ''}
              onChange={(val) =>
                updateParams({ seriesId: String(val) || null })
              }
              options={seriesOptions}
              placeholder="시리즈"
              className={styles.select}
            />
            <div className={styles.sortWrap}>{sortSegmented}</div>
          </div>
        </div>

        {/* ─── Category chip row ─── */}
        {categories.length > 0 && (
          <div className={styles.tagRow}>
            <div className={styles.tagScroll}>
              <button
                type="button"
                onClick={() => updateParams({ categorySlug: null })}
                className={[
                  styles.tagChip,
                  !currentCategory ? styles.tagChipActive : '',
                ].join(' ')}
              >
                전체 카테고리
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateParams({ categorySlug: c.slug })}
                  className={[
                    styles.tagChip,
                    currentCategory === c.slug ? styles.tagChipActive : '',
                  ].join(' ')}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Tags chip row ─── */}
        {tags.length > 0 && (
          <div className={styles.tagRow}>
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
            {hasResettableFilters && (
              <button
                type="button"
                className={styles.reset}
                onClick={() => router.push('/posts')}
              >
                <X size={12} /> 필터 초기화
              </button>
            )}
          </div>
        )}

        {tags.length === 0 && hasResettableFilters && (
          <div className={styles.resetRow}>
            <button
              type="button"
              className={styles.reset}
              onClick={() => router.push('/posts')}
            >
              <X size={12} /> 필터 초기화
            </button>
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
