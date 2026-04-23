import type { MetadataRoute } from 'next';
import { getPublicSettings } from '@/utils/public-settings';
import { resolveSiteUrl } from '@/utils/site-url';
import { serverGet } from '@/utils/server-api';
import type {
  ApiListPayload,
  GalleryItem,
  PostListItem,
} from '@/types';

const SITEMAP_PAGE_SIZE = 100;

function toAbsoluteUrl(path: string): string {
  return new URL(path, resolveSiteUrl()).toString();
}

async function getAllPublishedPosts(): Promise<PostListItem[]> {
  const items: PostListItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await serverGet<ApiListPayload<PostListItem>>(
      '/public/posts',
      { page, limit: SITEMAP_PAGE_SIZE },
      { revalidate: 300 },
    );

    if (!payload) {
      break;
    }

    items.push(...payload.items);
    totalPages = payload.meta.totalPages;
    page += 1;
  }

  return items;
}

async function getAllPublishedPhotos(): Promise<GalleryItem[]> {
  const items: GalleryItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await serverGet<ApiListPayload<GalleryItem>>(
      '/public/gallery',
      { page, limit: SITEMAP_PAGE_SIZE },
      { revalidate: 300 },
    );

    if (!payload) {
      break;
    }

    items.push(...payload.items);
    totalPages = payload.meta.totalPages;
    page += 1;
  }

  return items;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getPublicSettings();

  if (settings?.enable_sitemap === 'false') {
    return [];
  }

  const [posts, photos] = await Promise.all([
    getAllPublishedPosts(),
    getAllPublishedPhotos(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: toAbsoluteUrl('/posts'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl('/photos'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl('/about'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: toAbsoluteUrl(`/posts/${post.slug}`),
    lastModified: post.updatedAt || post.publishedAt || post.createdAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const photoRoutes: MetadataRoute.Sitemap = photos.map((photo) => ({
    url: toAbsoluteUrl(`/photos/${photo.id}`),
    lastModified: photo.updatedAt || photo.createdAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...photoRoutes];
}
