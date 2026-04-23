import type { Metadata } from 'next';
import { Suspense } from 'react';
import { serverGet, toPaginatedResponse } from '@/utils/server-api';
import {
  createNoIndexRobots,
  createPublicMetadata,
} from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';
import { PostsPage } from '@/components/public/posts/PostsPage';
import { PublicCollectionSkeleton } from '@/components/public/shared/PublicCollectionSkeleton';
import type {
  Series,
  Category,
  ApiListPayload,
  PostListItem,
  PostListResponse,
  PostSort,
} from '@/types';
import { normalizePostQuery } from '@/utils/post-query';

export const revalidate = 60;

function buildPostsCanonicalPath(params: SearchParams): string {
  const normalized = normalizePostQuery({
    page: params.page,
    search: params.search,
    tag: params.tag,
    seriesId: params.seriesId,
    categorySlug: params.categorySlug,
    sort: params.sort,
  });
  const query = new URLSearchParams();

  if (normalized.page && normalized.page > 1) {
    query.set('page', String(normalized.page));
  }

  if (normalized.search) {
    query.set('search', normalized.search);
  }

  if (normalized.tag) {
    query.set('tag', normalized.tag);
  }

  if (normalized.seriesId) {
    query.set('seriesId', String(normalized.seriesId));
  }

  if (normalized.categorySlug) {
    query.set('categorySlug', normalized.categorySlug);
  }

  if (normalized.sort && normalized.sort !== 'latest') {
    query.set('sort', normalized.sort);
  }

  const queryString = query.toString();
  return queryString ? `/posts?${queryString}` : '/posts';
}

export async function generateMetadata(
  { searchParams }: PostsRouteProps,
): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const settings = await getPublicSettings();
  const canonicalPath = buildPostsCanonicalPath(resolvedSearchParams);

  return createPublicMetadata({
    title: '글',
    description: '개발, 사진, 그리고 기록을 주제별로 모아둔 글 목록',
    path: canonicalPath,
    settings,
    keywords: ['개발', '사진', '기록', '블로그 글'],
    robots: resolvedSearchParams.search ? createNoIndexRobots() : undefined,
  });
}

interface SearchParams {
  page?: string;
  search?: string;
  tag?: string;
  seriesId?: string;
  categorySlug?: string;
  sort?: string;
}

interface PostsRouteProps {
  searchParams: Promise<SearchParams>;
}

async function PostsContent({ searchParams }: { searchParams: SearchParams }) {
  const hasRefinements = Boolean(
    searchParams.search ||
      searchParams.tag ||
      searchParams.seriesId ||
      searchParams.categorySlug ||
      searchParams.sort === 'popular',
  );
  const params = {
    limit: 15,
    ...normalizePostQuery({
      page: searchParams.page,
      search: searchParams.search,
      tag: searchParams.tag,
      seriesId: searchParams.seriesId,
      categorySlug: searchParams.categorySlug,
      sort: searchParams.sort,
    }),
  } satisfies Record<string, string | number>;
  const liveOptions = {
    cache: 'no-store' as const,
    revalidate: false as const,
  };
  const cachedOptions = { revalidate: 60 as const };

  const [rawPosts, rawAllPosts, series, tags, categories] = await Promise.all([
    serverGet<ApiListPayload<PostListItem>>('/public/posts', params, liveOptions),
    hasRefinements
      ? serverGet<ApiListPayload<PostListItem>>(
          '/public/posts',
          { limit: 1 },
          cachedOptions,
        )
      : Promise.resolve(null),
    serverGet<Series[]>('/public/series', undefined, cachedOptions),
    serverGet<string[]>('/public/posts/tags', undefined, cachedOptions),
    serverGet<Category[]>('/public/categories', undefined, cachedOptions),
  ]);

  const postList: PostListResponse = rawPosts
    ? toPaginatedResponse(rawPosts)
    : { data: [], total: 0, page: 1, limit: 15, totalPages: 0 };
  const currentSearch = searchParams.search ?? '';
  const currentTag = searchParams.tag ?? '';
  const currentSeries = searchParams.seriesId ?? '';
  const currentCategory = searchParams.categorySlug ?? '';
  const currentSort: PostSort =
    searchParams.sort === 'popular' ? 'popular' : 'latest';

  return (
    <PostsPage
      postList={postList}
      overallTotal={
        hasRefinements ? (rawAllPosts?.meta.total ?? postList.total) : postList.total
      }
      series={series ?? []}
      tags={tags ?? []}
      categories={categories ?? []}
      currentSearch={currentSearch}
      currentTag={currentTag}
      currentSeries={currentSeries}
      currentCategory={currentCategory}
      currentSort={currentSort}
    />
  );
}

export default async function PostsRoute({ searchParams }: PostsRouteProps) {
  const resolved = await searchParams;
  return (
    <Suspense fallback={<PublicCollectionSkeleton variant="posts" />}>
      <PostsContent searchParams={resolved} />
    </Suspense>
  );
}
