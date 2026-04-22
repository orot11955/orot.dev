import type { Metadata } from 'next';
import { serverGet, toPaginatedResponse } from '@/utils/server-api';
import { createPublicMetadata } from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';
import { HomePage } from '@/components/public/home/HomePage';
import type {
  ApiListPayload,
  GalleryItem,
  PostListItem,
  Series,
} from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const seoHomeTitle = settings?.seo_home_title?.trim();
  const seoHomeDescription = settings?.seo_home_description?.trim();

  return createPublicMetadata({
    absoluteTitle: seoHomeTitle,
    description: seoHomeDescription,
    path: '/',
    settings,
    keywords: ['개발', '사진', '기록', '블로그'],
  });
}

export default async function HomeRoute() {
  const liveOptions = { cache: 'no-store' as const, revalidate: false as const };
  const [postsPayload, photosPayload, settings, series, tags] =
    await Promise.all([
      serverGet<ApiListPayload<PostListItem>>(
        '/public/posts',
        { limit: 6 },
        liveOptions,
      ),
      serverGet<ApiListPayload<GalleryItem>>(
        '/public/gallery',
        { limit: 8 },
        liveOptions,
      ),
      getPublicSettings(),
      serverGet<Series[]>('/public/series', undefined, liveOptions),
      serverGet<string[]>('/public/posts/tags', undefined, liveOptions),
    ]);

  const posts = postsPayload ? toPaginatedResponse(postsPayload).data : [];
  const photoList = photosPayload
    ? toPaginatedResponse(photosPayload)
    : { data: [], total: 0, page: 1, limit: 8, totalPages: 0 };

  return (
    <HomePage
      posts={posts}
      photos={photoList.data}
      photoTotal={photoList.total}
      series={series ?? []}
      tags={tags ?? []}
      settings={settings}
    />
  );
}
