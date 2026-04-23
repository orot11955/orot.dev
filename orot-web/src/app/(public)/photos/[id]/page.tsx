import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { PhotoDetailPage } from '@/components/public/photos/PhotoDetailPage';
import { serverGet } from '@/utils/server-api';
import {
  createPublicMetadata,
  createPublicNotFoundMetadata,
} from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';
import type { GalleryItem } from '@/types';

interface PhotoDetailRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 60;

const getPublicPhotoDetail = cache(async (id: string): Promise<GalleryItem | null> =>
  serverGet<GalleryItem>(`/public/gallery/${id}`, undefined, {
    cache: 'no-store',
    revalidate: false,
  }),
);

export async function generateMetadata(
  { params }: PhotoDetailRouteProps,
): Promise<Metadata> {
  const { id } = await params;
  const [photo, settings] = await Promise.all([
    getPublicPhotoDetail(id),
    getPublicSettings(),
  ]);

  if (!photo) {
    return createPublicNotFoundMetadata({
      title: '사진을 찾을 수 없음',
      description: '요청한 사진을 찾을 수 없습니다.',
      settings,
    });
  }

  const title = photo.title?.trim() || photo.altText?.trim() || `사진 ${photo.id}`;
  const description =
    photo.description?.trim() || 'orot.dev 퍼블릭 갤러리에서 크게 보는 사진 화면';

  return createPublicMetadata({
    title: `${title} · 사진`,
    description,
    path: `/photos/${photo.id}`,
    settings,
    image: photo.imageUrl,
    keywords: ['사진', '갤러리'],
  });
}

export default async function PhotoDetailRoute({ params }: PhotoDetailRouteProps) {
  const { id } = await params;
  const photo = await getPublicPhotoDetail(id);

  if (!photo) {
    notFound();
  }

  return <PhotoDetailPage photo={photo} />;
}
