import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PhotosPage } from '@/components/public/photos/PhotosPage';
import { createPublicMetadata } from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';
import { serverGet, toPaginatedResponse } from '@/utils/server-api';
import { PublicCollectionSkeleton } from '@/components/public/shared/PublicCollectionSkeleton';
import type {
  ApiListPayload,
  GalleryItem,
  GalleryListResponse,
  GallerySort,
} from '@/types';

function buildPhotosCanonicalPath(params: SearchParams): string {
  const normalizedPage = normalizePage(params.page);
  const normalizedSort = normalizeSort(params.sort);
  const query = new URLSearchParams();

  if (normalizedPage > 1) {
    query.set('page', String(normalizedPage));
  }

  if (normalizedSort !== 'manual') {
    query.set('sort', normalizedSort);
  }

  const queryString = query.toString();
  return queryString ? `/photos?${queryString}` : '/photos';
}

export async function generateMetadata(
  { searchParams }: PhotosRouteProps,
): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const settings = await getPublicSettings();

  return createPublicMetadata({
    title: '사진',
    description: '빛과 거리감이 남는 장면들을 모아 둔 퍼블릭 사진 갤러리',
    path: buildPhotosCanonicalPath(resolvedSearchParams),
    settings,
    keywords: ['사진', '갤러리', '포트폴리오'],
  });
}

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
    <Suspense fallback={<PublicCollectionSkeleton variant="photos" />}>
      <PhotosContent searchParams={resolved} />
    </Suspense>
  );
}
