import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PhotoDetailPage } from '@/components/public/photos/PhotoDetailPage';
import { serverGet } from '@/utils/server-api';
import type { GalleryItem } from '@/types';

interface PhotoDetailRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 60;

export async function generateMetadata(
  { params }: PhotoDetailRouteProps,
): Promise<Metadata> {
  const { id } = await params;
  const photo = await serverGet<GalleryItem>(`/public/gallery/${id}`, undefined, {
    cache: 'no-store',
    revalidate: false,
  });

  if (!photo) {
    return {
      title: '사진 | orot.dev',
    };
  }

  const title = photo.title?.trim() || photo.altText?.trim() || `사진 ${photo.id}`;
  const description =
    photo.description?.trim() || 'orot.dev 퍼블릭 갤러리에서 크게 보는 사진 화면';

  return {
    title: `${title} | 사진 | orot.dev`,
    description,
  };
}

export default async function PhotoDetailRoute({ params }: PhotoDetailRouteProps) {
  const { id } = await params;
  const photo = await serverGet<GalleryItem>(`/public/gallery/${id}`, undefined, {
    cache: 'no-store',
    revalidate: false,
  });

  if (!photo) {
    notFound();
  }

  return <PhotoDetailPage photo={photo} />;
}
