'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Search, Segmented, Select, X } from 'orot-ui';
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
}: PostsPageControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(currentSearch);

  useEffect(() => {
    setKeyword(currentSearch);
  }, [currentSearch]);

  const activeSeries = useMemo(
    () => series.find((item) => String(item.id) === currentSeries),
    [series, currentSeries],
  );

  const hasResettableFilters = Boolean(
    currentSearch || currentTag || currentSeries || currentCategory,
  );

  const sortOptions: Array<{ label: string; value: PostSort }> = [
    { label: '최신순', value: 'latest' },
    { label: '인기순', value: 'popular' },
  ];

  const seriesOptions = [
    { label: '모든 시리즈', value: '' },
    ...series.map((item) => ({ label: item.title, value: String(item.id) })),
  ];

  const categoryOptions = [
    { label: '모든 카테고리', value: '' },
    ...categories.map((item) => ({ label: item.name, value: item.slug })),
  ];

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        next.delete(key);
        return;
      }

      next.set(key, value);
    });

    next.delete('page');

    const queryString = next.toString();
    router.push(queryString ? `/posts?${queryString}` : '/posts');
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateParams({ search: keyword.trim() || null });
  };

  return (
    <>
      <div className={styles.toolbar}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <Input
            type="search"
            size="md"
            prefix={<Search size={14} />}
            placeholder="제목, 내용으로 검색"
            value={keyword}
            onChange={(event) => {
              const nextKeyword = event.target.value;
              setKeyword(nextKeyword);

              if (nextKeyword === '' && currentSearch) {
                updateParams({ search: null });
              }
            }}
            allowClear
            className={styles.search}
          />
        </form>

        <div className={styles.toolbarControls}>
          <Select
            size="md"
            value={currentCategory}
            onChange={(value) =>
              updateParams({
                categorySlug: value == null || value === '' ? null : String(value),
              })
            }
            options={categoryOptions}
            placeholder="카테고리"
            className={styles.select}
          />
          <Select
            size="md"
            value={currentSeries}
            onChange={(value) =>
              updateParams({
                seriesId: value == null || value === '' ? null : String(value),
              })
            }
            options={seriesOptions}
            placeholder="시리즈"
            className={styles.select}
          />
          <div className={styles.sortWrap}>
            <Segmented
              size="sm"
              value={currentSort}
              onChange={(value) =>
                updateParams({ sort: value === 'latest' ? null : String(value) })
              }
              options={sortOptions}
            />
          </div>
        </div>
      </div>

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
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => updateParams({ categorySlug: category.slug })}
                className={[
                  styles.tagChip,
                  currentCategory === category.slug ? styles.tagChipActive : '',
                ].join(' ')}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => updateParams({ tag })}
                className={[
                  styles.tagChip,
                  currentTag === tag ? styles.tagChipActive : '',
                ].join(' ')}
              >
                #{tag}
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

      {activeSeries && (
        <div className={styles.seriesBanner}>
          <div>
            <span className={styles.seriesBannerLabel}>SERIES</span>
            <div className={styles.seriesBannerTitle}>{activeSeries.title}</div>
            {activeSeries.description && (
              <p className={styles.seriesBannerDesc}>{activeSeries.description}</p>
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
    </>
  );
}
