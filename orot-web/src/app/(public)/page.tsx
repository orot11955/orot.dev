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
  const settingsPromise = getPublicSettings();
  const postsPromise = serverGet<ApiListPayload<PostListItem>>(
    '/public/posts',
    { limit: 6 },
    liveOptions,
  );
  const photosPromise = serverGet<ApiListPayload<GalleryItem>>(
    '/public/gallery',
    { limit: 8 },
    liveOptions,
  );
  const seriesPromise = serverGet<Series[]>(
    '/public/series',
    undefined,
    liveOptions,
  );
  const tagsPromise = serverGet<string[]>(
    '/public/posts/tags',
    undefined,
    liveOptions,
  );

  const settings = await settingsPromise;
  const configuredHeroImage = settings?.home_hero_image?.trim();

  const configuredHeroPromise = configuredHeroImage
    ? serverGet<ApiListPayload<GalleryItem>>(
        '/public/gallery',
        { imageUrl: configuredHeroImage, limit: 1 },
        liveOptions,
      )
    : Promise.resolve(null);

  const [postsPayload, photosPayload, configuredHeroPayload, series, tags] =
    await Promise.all([
      postsPromise,
      photosPromise,
      configuredHeroPromise,
      seriesPromise,
      tagsPromise,
    ]);

  const posts = postsPayload ? toPaginatedResponse(postsPayload).data : [];
  const configuredHeroPhoto = configuredHeroPayload
    ? toPaginatedResponse(configuredHeroPayload).data[0] ?? null
    : null;
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
      configuredHeroPhoto={configuredHeroPhoto}
    />
  );
}
