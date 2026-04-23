import type {
  ApiListPayload,
  Post,
  PostDetail,
  PostQuery,
} from '@/types';
import { normalizePostQuery } from '@/utils/post-query';
import { createDemoStore } from './data';
import { isDemoMode } from './mode';

type DemoParams = Record<string, string | number>;

function splitPath(path: string): string[] {
  return path
    .split('?')[0]
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function paginate<T>(
  data: T[],
  params: DemoParams | undefined,
  defaultLimit: number,
): ApiListPayload<T> {
  const page = toNumber(params?.page, 1);
  const limit = toNumber(params?.limit, defaultLimit);
  const total = data.length;
  const skip = (page - 1) * limit;

  return {
    items: data.slice(skip, skip + limit),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function includesText(value: string | null | undefined, keyword: string) {
  return Boolean(value?.toLowerCase().includes(keyword.toLowerCase()));
}

function applyPostQuery(posts: Post[], query: PostQuery) {
  const normalized = normalizePostQuery(query);
  let list = [...posts];

  if (normalized.search) {
    const keyword = String(normalized.search);
    list = list.filter((post) =>
      [post.title, post.slug, post.excerpt, post.tags, post.content].some(
        (value) => includesText(value, keyword),
      ),
    );
  }

  if (normalized.tag) {
    list = list.filter((post) =>
      (post.tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .includes(String(normalized.tag)),
    );
  }

  if (normalized.seriesId) {
    list = list.filter((post) => post.seriesId === Number(normalized.seriesId));
  }

  if (normalized.categorySlug) {
    list = list.filter((post) => post.category?.slug === normalized.categorySlug);
  }

  if (normalized.sort === 'popular') {
    return list.sort((a, b) => b.viewCount - a.viewCount);
  }

  return list.sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.updatedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.updatedAt ?? a.createdAt).getTime(),
  );
}

function getPostDetail(posts: Post[], post: Post): PostDetail {
  const detail = structuredClone(post) as PostDetail;
  if (!post.seriesId) {
    return detail;
  }

  const siblings = posts
    .filter((item) => item.seriesId === post.seriesId && item.status === 'PUBLISHED')
    .sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999));
  const index = siblings.findIndex((item) => item.id === post.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  detail.prev = prev ? { id: prev.id, title: prev.title, slug: prev.slug } : null;
  detail.next = next ? { id: next.id, title: next.title, slug: next.slug } : null;
  return detail;
}

export function demoServerGet<T>(
  path: string,
  params?: DemoParams,
): T | null {
  if (!isDemoMode()) {
    return null;
  }

  const store = createDemoStore();
  const parts = splitPath(path);
  const [scope, resource, idOrAction] = parts;

  if (scope !== 'public') {
    return null;
  }

  if (resource === 'settings') {
    return store.settings as T;
  }

  if (resource === 'posts' && idOrAction === 'tags') {
    const tags = Array.from(
      new Set(
        store.posts
          .filter((post) => post.status === 'PUBLISHED')
          .flatMap((post) => (post.tags ?? '').split(',').map((tag) => tag.trim()))
          .filter(Boolean),
      ),
    ).sort();
    return tags as T;
  }

  if (resource === 'posts' && idOrAction) {
    const post = store.posts.find(
      (item) => item.slug === idOrAction && item.status === 'PUBLISHED',
    );
    return post ? (getPostDetail(store.posts, post) as T) : null;
  }

  if (resource === 'posts') {
    const posts = applyPostQuery(
      store.posts.filter((post) => post.status === 'PUBLISHED'),
      (params ?? {}) as PostQuery,
    );
    return paginate(posts, params, 10) as T;
  }

  if (resource === 'categories' && idOrAction) {
    return (store.categories.find((item) => item.slug === idOrAction) ?? null) as T | null;
  }

  if (resource === 'categories') {
    return store.categories.filter((category) =>
      store.posts.some(
        (post) => post.status === 'PUBLISHED' && post.categoryId === category.id,
      ),
    ) as unknown as T;
  }

  if (resource === 'series' && idOrAction) {
    return (store.series.find((item) => item.slug === idOrAction) ?? null) as T | null;
  }

  if (resource === 'series') {
    return store.series.filter((item) => (item._count?.posts ?? 0) > 0) as unknown as T;
  }

  if (resource === 'gallery' && idOrAction) {
    return (
      store.gallery.find(
        (item) => item.id === Number(idOrAction) && item.isPublished,
      ) ?? null
    ) as T | null;
  }

  if (resource === 'gallery') {
    let list = store.gallery.filter((item) => item.isPublished);
    if (params?.imageUrl) {
      list = list.filter((item) => item.imageUrl === params.imageUrl);
    }
    return paginate(list, params, 24) as unknown as T;
  }

  return null;
}
