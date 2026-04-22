import type { Metadata } from 'next';
import { Suspense } from 'react';
import { serverGet, toPaginatedResponse } from '@/utils/server-api';
import { createPublicMetadata } from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';
import { PostsPage } from '@/components/public/posts/PostsPage';
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();

  return createPublicMetadata({
    title: '글',
    description: '개발, 사진, 그리고 기록을 주제별로 모아둔 글 목록',
    path: '/posts',
    settings,
    keywords: ['개발', '사진', '기록', '블로그 글'],
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
  const liveOptions = { cache: 'no-store' as const, revalidate: false as const };

  const [rawPosts, rawAllPosts, series, tags, categories] = await Promise.all([
    serverGet<ApiListPayload<PostListItem>>('/public/posts', params, liveOptions),
    serverGet<ApiListPayload<PostListItem>>('/public/posts', { limit: 1 }, liveOptions),
    serverGet<Series[]>('/public/series', undefined, liveOptions),
    serverGet<string[]>('/public/posts/tags', undefined, liveOptions),
    serverGet<Category[]>('/public/categories', undefined, liveOptions),
  ]);

  const postList: PostListResponse = rawPosts
    ? toPaginatedResponse(rawPosts)
    : { data: [], total: 0, page: 1, limit: 15, totalPages: 0 };
  const currentSearch = searchParams.search ?? '';
  const currentTag = searchParams.tag ?? '';
  const currentSeries = searchParams.seriesId ?? '';
  const currentCategory = searchParams.categorySlug ?? '';
  const currentSort: PostSort = searchParams.sort === 'popular' ? 'popular' : 'latest';

  return (
    <PostsPage
      postList={postList}
      overallTotal={rawAllPosts?.meta.total ?? postList.total}
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
    <Suspense fallback={null}>
      <PostsContent searchParams={resolved} />
    </Suspense>
  );
}
