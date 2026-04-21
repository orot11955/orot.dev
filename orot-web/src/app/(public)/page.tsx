import type { Metadata } from 'next';
import { serverGet, toPaginatedResponse } from '@/utils/server-api';
import { HomePage } from '@/components/public/home/HomePage';
import type {
  ApiListPayload,
  GalleryItem,
  PostListItem,
  PublicSettings,
  Series,
} from '@/types';

export const metadata: Metadata = {
  title: 'orot.dev',
  description: '개발, 사진, 그리고 기록',
};

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
      serverGet<PublicSettings>('/public/settings', undefined, liveOptions),
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
