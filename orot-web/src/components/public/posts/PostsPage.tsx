import Link from 'next/link';
import { FileText } from 'lucide-react';
import type { Category, PostListResponse, PostSort, Series } from '@/types';
import { PostCard } from '../shared/PostCard';
import { PostsPageControls } from './PostsPageControls';
import { PostsPagination } from './PostsPagination';
import styles from './PostsPage.module.css';

interface PostsPageProps {
  postList: PostListResponse;
  overallTotal: number;
  series: Series[];
  tags: string[];
  categories: Category[];
  currentSearch: string;
  currentTag: string;
  currentSeries: string;
  currentCategory: string;
  currentSort: PostSort;
}

export function PostsPage({
  postList,
  overallTotal,
  series,
  tags,
  categories,
  currentSearch,
  currentTag,
  currentSeries,
  currentCategory,
  currentSort,
}: PostsPageProps) {
  const hasFilters = Boolean(
    currentSearch ||
      currentTag ||
      currentSeries ||
      currentCategory ||
      currentSort !== 'latest',
  );

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.eyebrow}>POSTS</span>
            <h1 className={styles.title}>글</h1>
          </div>
          <p className={styles.subtitle}>
            전체 <strong>{overallTotal}</strong>편의 글을 읽어보세요.
          </p>
        </header>

        <PostsPageControls
          series={series}
          tags={tags}
          categories={categories}
          currentSearch={currentSearch}
          currentTag={currentTag}
          currentSeries={currentSeries}
          currentCategory={currentCategory}
          currentSort={currentSort}
          filteredTotal={postList.total}
        />

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

        {postList.totalPages > 1 && (
          <div className={styles.pagination}>
            <PostsPagination
              current={postList.page}
              total={postList.total}
              pageSize={postList.limit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
