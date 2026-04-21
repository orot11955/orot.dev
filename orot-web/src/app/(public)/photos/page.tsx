import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PhotosPage } from '@/components/public/photos/PhotosPage';
import { serverGet, toPaginatedResponse } from '@/utils/server-api';
import type {
  ApiListPayload,
  GalleryItem,
  GalleryListResponse,
  GallerySort,
} from '@/types';

export const metadata: Metadata = {
  title: '사진 | orot.dev',
  description: '빛과 거리감이 남는 장면들을 모아 둔 퍼블릭 사진 갤러리',
};

const PAGE_SIZE = 24;
const GALLERY_SORTS: GallerySort[] = [
  'manual',
  'takenAtDesc',
  'takenAtAsc',
  'createdAtDesc',
];

interface SearchParams {
  page?: string;
  sort?: string;
}

interface PhotosRouteProps {
  searchParams: Promise<SearchParams>;
}

function normalizePage(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeSort(value?: string): GallerySort {
  if (value && GALLERY_SORTS.includes(value as GallerySort)) {
    return value as GallerySort;
  }

  return 'manual';
}

async function PhotosContent({ searchParams }: { searchParams: SearchParams }) {
  const currentSort = normalizeSort(searchParams.sort);
  const photosPayload = await serverGet<ApiListPayload<GalleryItem>>(
    '/public/gallery',
    {
      page: normalizePage(searchParams.page),
      limit: PAGE_SIZE,
      ...(currentSort !== 'manual' ? { sort: currentSort } : {}),
    },
    { cache: 'no-store', revalidate: false },
  );

  const photoList: GalleryListResponse = photosPayload
    ? toPaginatedResponse(photosPayload)
    : {
        data: [],
        total: 0,
        page: 1,
        limit: PAGE_SIZE,
        totalPages: 0,
      };

  return <PhotosPage photoList={photoList} currentSort={currentSort} />;
}

export default async function PhotosRoute({ searchParams }: PhotosRouteProps) {
  const resolved = await searchParams;

  return (
    <Suspense fallback={null}>
      <PhotosContent searchParams={resolved} />
    </Suspense>
  );
}
