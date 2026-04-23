'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, Input, Search, Select, X } from 'orot-ui';
import { useFilterParams } from '@/hooks';
import type { Category, PostSort, Series } from '@/types';
import {
  PublicFilterChip,
  PublicFilterGroup,
  PublicFilterPanel,
} from '../shared/PublicFilterPanel';
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
  const { updateParams, resetParams } = useFilterParams('/posts');
  const [keyword, setKeyword] = useState(currentSearch);

  useEffect(() => {
    setKeyword(currentSearch);
  }, [currentSearch]);

  const activeSeries = useMemo(
    () => series.find((item) => String(item.id) === currentSeries),
    [series, currentSeries],
  );

  const hasResettableFilters = Boolean(
    currentSearch ||
      currentTag ||
      currentSeries ||
      currentCategory ||
      currentSort !== 'latest',
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

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateParams({ search: keyword.trim() || null });
  };

  return (
    <>
      <PublicFilterPanel
        hasResettableFilters={hasResettableFilters}
        onReset={resetParams}
        search={
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <Input
              type="search"
              size="md"
              prefix={<Search size={14} />}
              placeholder="제목, 내용, 태그로 검색"
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
            <Button
              type="submit"
              size="md"
              variant="solid"
              className={styles.searchButton}
            >
              검색
            </Button>
          </form>
        }
        controls={
          <>
            <Select
              size="md"
              value={currentCategory}
              onChange={(value) =>
                updateParams({
                  categorySlug:
                    value == null || value === '' ? null : String(value),
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
            <Select
              size="md"
              value={currentSort}
              onChange={(value) =>
                updateParams({
                  sort: value === 'latest' ? null : String(value),
                })
              }
              options={sortOptions}
              placeholder="정렬"
              className={styles.select}
            />
          </>
        }
      >
        {tags.length > 0 && (
          <PublicFilterGroup label="태그">
            <PublicFilterChip
              active={!currentTag}
              onClick={() => updateParams({ tag: null })}
            >
              전체 태그
            </PublicFilterChip>
            {tags.map((tag) => (
              <PublicFilterChip
                key={tag}
                active={currentTag === tag}
                onClick={() => updateParams({ tag })}
              >
                #{tag}
              </PublicFilterChip>
            ))}
          </PublicFilterGroup>
        )}
      </PublicFilterPanel>

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
