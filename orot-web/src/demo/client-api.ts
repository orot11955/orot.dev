import type {
  AnalyticsStats,
  ApiListPayload,
  Category,
  Comment,
  CreateCategoryPayload,
  CreateCommentPayload,
  CreateGalleryItemPayload,
  CreatePostPayload,
  CreateSeriesPayload,
  GalleryItem,
  GalleryQuery,
  Post,
  PostDetail,
  PostQuery,
  PostStatus,
  Series,
  TransitionPostPayload,
  UpdateCategoryPayload,
  UpdateGalleryItemPayload,
  UpdatePostPayload,
  UpdateSeriesPayload,
} from '@/types';
import { normalizePostQuery } from '@/utils/post-query';
import { DEMO_STORAGE_KEY } from './mode';
import { createDemoStore, type DemoStore } from './data';

const EDITOR_VISIBLE_STATUSES: PostStatus[] = [
  'DRAFT',
  'COMPLETED',
  'REVIEW',
  'UPDATED',
];
const STUDIO_VISIBLE_STATUSES: PostStatus[] = [
  'REVIEW',
  'UPDATED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];
const POST_STATUS_ORDER: PostStatus[] = [
  'DRAFT',
  'COMPLETED',
  'REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'UPDATED',
  'ARCHIVED',
];

type QueryParams = Record<string, string | number | boolean | undefined>;
type FormEntries = Record<string, string | number | boolean | Blob | Date | Array<string | number | boolean | Blob | Date> | null | undefined>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'post';
}

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

function includesText(value: string | null | undefined, keyword: string) {
  return Boolean(value?.toLowerCase().includes(keyword.toLowerCase()));
}

function loadStore(): DemoStore {
  if (typeof window === 'undefined') {
    return createDemoStore();
  }

  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as DemoStore;
    }
  } catch {
    // Fall through to a fresh snapshot.
  }

  const store = createDemoStore();
  saveStore(store);
  return store;
}

function saveStore(store: DemoStore) {
  refreshRelations(store);

  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store));
}

function makeCategorySummary(store: DemoStore, id: number | null | undefined) {
  const category = store.categories.find((item) => item.id === id);
  return category
    ? { id: category.id, name: category.name, slug: category.slug }
    : null;
}

function makeSeriesSummary(store: DemoStore, id: number | null | undefined) {
  const series = store.series.find((item) => item.id === id);
  return series
    ? { id: series.id, title: series.title, slug: series.slug }
    : null;
}

function refreshRelations(store: DemoStore) {
  store.posts.forEach((post) => {
    post.category = makeCategorySummary(store, post.categoryId);
    post.series = makeSeriesSummary(store, post.seriesId);
  });

  store.categories.forEach((category) => {
    category._count = {
      posts: store.posts.filter((post) => post.categoryId === category.id).length,
    };
  });

  store.series.forEach((series) => {
    const seriesPosts = store.posts
      .filter((post) => post.seriesId === series.id && post.status === 'PUBLISHED')
      .sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999));

    series.posts = seriesPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      publishedAt: post.publishedAt,
      seriesOrder: post.seriesOrder,
    }));
    series._count = { posts: seriesPosts.length };
  });

  store.comments.forEach((comment) => {
    const post = store.posts.find((item) => item.id === comment.postId);
    comment.post = post
      ? { id: post.id, title: post.title, slug: post.slug }
      : undefined;
    comment.parent = comment.parentId
      ? store.comments
          .filter((item) => item.id === comment.parentId)
          .map((item) => ({ id: item.id, authorName: item.authorName }))[0] ?? null
      : null;
  });
}

function paginate<T>(
  data: T[],
  query: QueryParams | undefined,
  defaultLimit = 10,
): ApiListPayload<T> {
  const page = toNumber(query?.page, 1);
  const limit = toNumber(query?.limit, defaultLimit);
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

function applyPostQuery(
  store: DemoStore,
  posts: Post[],
  query: PostQuery,
) {
  const normalized = normalizePostQuery(query);
  let list = [...posts];

  if (normalized.status) {
    list = list.filter((post) => post.status === normalized.status);
  }

  if (normalized.categoryId) {
    list = list.filter((post) => post.categoryId === Number(normalized.categoryId));
  }

  if (normalized.categorySlug) {
    const category = store.categories.find(
      (item) => item.slug === normalized.categorySlug,
    );
    list = list.filter((post) => post.categoryId === category?.id);
  }

  if (normalized.seriesId) {
    list = list.filter((post) => post.seriesId === Number(normalized.seriesId));
  }

  if (normalized.tag) {
    list = list.filter((post) =>
      (post.tags ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .includes(String(normalized.tag)),
    );
  }

  if (normalized.search) {
    const keyword = String(normalized.search);
    list = list.filter((post) =>
      [
        post.title,
        post.slug,
        post.excerpt,
        post.tags,
        post.content,
        post.category?.name,
        post.series?.title,
      ].some((value) => includesText(value, keyword)),
    );
  }

  if (normalized.sort === 'popular') {
    list.sort((a, b) => b.viewCount - a.viewCount);
  } else {
    list.sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.publishedAt ?? a.updatedAt ?? a.createdAt).getTime(),
    );
  }

  return list;
}

function getPostDetail(store: DemoStore, post: Post): PostDetail {
  const detail = clone(post) as PostDetail;
  if (!post.seriesId) {
    return detail;
  }

  const siblings = store.posts
    .filter((item) => item.seriesId === post.seriesId && item.status === 'PUBLISHED')
    .sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999));
  const index = siblings.findIndex((item) => item.id === post.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  detail.prev = prev ? { id: prev.id, title: prev.title, slug: prev.slug } : null;
  detail.next = next ? { id: next.id, title: next.title, slug: next.slug } : null;
  return detail;
}

function transitionPost(post: Post, payload: TransitionPostPayload) {
  post.status = payload.status;
  post.updatedAt = nowIso();

  if (payload.status === 'SCHEDULED') {
    post.scheduledAt = payload.scheduledAt ?? post.scheduledAt ?? nowIso();
  }

  if (payload.status === 'PUBLISHED') {
    post.publishedAt = post.publishedAt ?? nowIso();
    post.scheduledAt = null;
  }

  if (payload.status === 'DRAFT') {
    post.scheduledAt = null;
  }
}

function listCommentsForPublic(store: DemoStore, postId: number): Comment[] {
  const approved = store.comments
    .filter((comment) => comment.postId === postId && comment.status === 'APPROVED')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const map = new Map<number, Comment>();
  const roots: Comment[] = [];

  approved.forEach((comment) => {
    map.set(comment.id, { ...clone(comment), replies: [] });
  });

  approved.forEach((comment) => {
    const node = map.get(comment.id);
    if (!node) return;
    if (comment.parentId) {
      map.get(comment.parentId)?.replies?.push(node);
      return;
    }
    roots.push(node);
  });

  return roots;
}

function listCommentsForStudio(store: DemoStore, query: QueryParams | undefined) {
  let list = [...store.comments];
  const status = query?.status?.toString();
  const search = query?.search?.toString();

  if (status) {
    list = list.filter((comment) => comment.status === status);
  }

  if (search) {
    list = list.filter((comment) =>
      [
        comment.content,
        comment.authorName,
        comment.authorEmail,
        comment.post?.title,
      ].some((value) => includesText(value, search)),
    );
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return paginate(list, query);
}

function getAnalytics(store: DemoStore): {
  visitors: AnalyticsStats['visitors'];
  topPosts: Array<AnalyticsStats['topPosts'][number] & { publishedAt?: string }>;
  visitorTrend: AnalyticsStats['dailyVisits'];
  postStats: Partial<Record<PostStatus, number>>;
} {
  const topPosts = store.posts
    .filter((post) => post.status === 'PUBLISHED')
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5)
    .map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      viewCount: post.viewCount,
      publishedAt: post.publishedAt ?? undefined,
    }));

  const totalVisitors = store.dailyVisits.reduce((sum, item) => sum + item.count, 0);
  const weekVisitors = store.dailyVisits.slice(-7).reduce((sum, item) => sum + item.count, 0);
  const monthVisitors = totalVisitors;
  const todayVisitors = store.dailyVisits.at(-1)?.count ?? 0;
  const postStats = Object.fromEntries(
    POST_STATUS_ORDER.map((status) => [
      status,
      store.posts.filter((post) => post.status === status).length,
    ]),
  ) as Partial<Record<PostStatus, number>>;

  return {
    visitors: {
      today: todayVisitors,
      week: weekVisitors,
      month: monthVisitors,
      total: totalVisitors,
    },
    topPosts,
    visitorTrend: store.dailyVisits,
    postStats,
  };
}

function upsertSettings(store: DemoStore, payload: {
  settings: Array<{ key: string; value: string | null | undefined }>;
}) {
  payload.settings.forEach((item) => {
    store.settings[item.key] = item.value ?? '';
  });
  return store.settings;
}

function createGalleryItem(
  store: DemoStore,
  payload: Partial<CreateGalleryItemPayload> = {},
): GalleryItem {
  const id = store.nextIds.gallery;
  store.nextIds.gallery += 1;
  const createdAt = nowIso();
  const item: GalleryItem = {
    id,
    title: payload.title || `Demo upload ${id}`,
    description: payload.description || '',
    imageUrl: '/demo-media/demo-gallery.svg',
    thumbnailUrl: '/demo-media/demo-gallery.svg',
    altText: payload.altText || payload.title || `Demo upload ${id}`,
    width: 1200,
    height: 900,
    takenAt: payload.takenAt || null,
    isPublished: false,
    sortOrder: Number(payload.sortOrder ?? store.gallery.length + 1),
    createdAt,
    updatedAt: createdAt,
  };
  store.gallery.unshift(item);
  return item;
}

export async function demoGet<T>(
  path: string,
  params?: QueryParams,
): Promise<T> {
  const store = loadStore();
  refreshRelations(store);
  const parts = splitPath(path);
  const [scope, resource, idOrAction, action] = parts;

  if (scope === 'public' && resource === 'settings') {
    return clone(store.settings) as T;
  }

  if (scope === 'public' && resource === 'posts' && idOrAction === 'tags') {
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

  if (scope === 'public' && resource === 'posts' && action === 'comments') {
    return listCommentsForPublic(store, Number(idOrAction)) as T;
  }

  if (scope === 'public' && resource === 'posts' && idOrAction) {
    const post = store.posts.find(
      (item) => item.slug === idOrAction && item.status === 'PUBLISHED',
    );
    if (!post) throw new Error('Post not found');
    return getPostDetail(store, post) as T;
  }

  if (scope === 'public' && resource === 'posts') {
    const list = applyPostQuery(
      store,
      store.posts.filter((post) => post.status === 'PUBLISHED'),
      (params ?? {}) as PostQuery,
    );
    return paginate(list, params, 10) as T;
  }

  if (scope === 'public' && resource === 'categories') {
    return clone(
      store.categories.filter((category) =>
        store.posts.some(
          (post) => post.status === 'PUBLISHED' && post.categoryId === category.id,
        ),
      ),
    ) as T;
  }

  if (scope === 'public' && resource === 'series' && idOrAction) {
    const found = store.series.find((item) => item.slug === idOrAction);
    if (!found) throw new Error('Series not found');
    return clone(found) as T;
  }

  if (scope === 'public' && resource === 'series') {
    return clone(store.series.filter((item) => (item._count?.posts ?? 0) > 0)) as T;
  }

  if (scope === 'public' && resource === 'gallery' && idOrAction) {
    const found = store.gallery.find(
      (item) => item.id === Number(idOrAction) && item.isPublished,
    );
    if (!found) throw new Error('Gallery item not found');
    return clone(found) as T;
  }

  if (scope === 'public' && resource === 'gallery') {
    let list = store.gallery.filter((item) => item.isPublished);
    const imageUrl = params?.imageUrl?.toString();
    const sort = params?.sort?.toString() as GalleryQuery['sort'];
    if (imageUrl) {
      list = list.filter((item) => item.imageUrl === imageUrl);
    }
    if (sort === 'takenAtAsc') {
      list.sort((a, b) => String(a.takenAt).localeCompare(String(b.takenAt)));
    } else if (sort === 'createdAtDesc') {
      list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    } else {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return paginate(list, params, 24) as T;
  }

  if (scope === 'editor' && resource === 'posts' && idOrAction) {
    const post = store.posts.find(
      (item) => item.id === Number(idOrAction) && EDITOR_VISIBLE_STATUSES.includes(item.status),
    );
    if (!post) throw new Error('Post not found');
    return clone(post) as T;
  }

  if (scope === 'editor' && resource === 'posts') {
    const list = applyPostQuery(
      store,
      store.posts.filter((post) => EDITOR_VISIBLE_STATUSES.includes(post.status)),
      (params ?? {}) as PostQuery,
    );
    return paginate(list, params, 20) as T;
  }

  if (scope === 'studio' && resource === 'posts' && idOrAction === 'slug' && action) {
    const post = store.posts.find(
      (item) => item.slug === action && STUDIO_VISIBLE_STATUSES.includes(item.status),
    );
    if (!post) throw new Error('Post not found');
    return getPostDetail(store, post) as T;
  }

  if (scope === 'studio' && resource === 'posts' && idOrAction) {
    const post = store.posts.find(
      (item) => item.id === Number(idOrAction) && STUDIO_VISIBLE_STATUSES.includes(item.status),
    );
    if (!post) throw new Error('Post not found');
    return clone(post) as T;
  }

  if (scope === 'studio' && resource === 'posts') {
    const list = applyPostQuery(
      store,
      store.posts.filter((post) => STUDIO_VISIBLE_STATUSES.includes(post.status)),
      (params ?? {}) as PostQuery,
    );
    return paginate(list, params, 10) as T;
  }

  if (scope === 'studio' && resource === 'categories' && idOrAction) {
    const found = store.categories.find((item) => item.id === Number(idOrAction));
    if (!found) throw new Error('Category not found');
    return clone(found) as T;
  }

  if (scope === 'public' && resource === 'categories' && idOrAction) {
    const found = store.categories.find((item) => item.slug === idOrAction);
    if (!found) throw new Error('Category not found');
    return clone(found) as T;
  }

  if ((scope === 'public' || scope === 'studio') && resource === 'categories') {
    return clone(store.categories.sort((a, b) => a.sortOrder - b.sortOrder)) as T;
  }

  if (scope === 'studio' && resource === 'series' && idOrAction) {
    const found = store.series.find((item) => item.id === Number(idOrAction));
    if (!found) throw new Error('Series not found');
    return clone(found) as T;
  }

  if (scope === 'studio' && resource === 'series') {
    return clone(store.series) as T;
  }

  if (scope === 'studio' && resource === 'gallery' && idOrAction) {
    const found = store.gallery.find((item) => item.id === Number(idOrAction));
    if (!found) throw new Error('Gallery item not found');
    return clone(found) as T;
  }

  if (scope === 'studio' && resource === 'gallery') {
    let list = [...store.gallery];
    const search = params?.search?.toString();
    if (params?.isPublished !== undefined) {
      list = list.filter((item) => item.isPublished === params.isPublished);
    }
    if (search) {
      list = list.filter((item) =>
        [item.title, item.description, item.altText].some((value) =>
          includesText(value, search),
        ),
      );
    }
    list.sort((a, b) => a.sortOrder - b.sortOrder);
    return paginate(list, params, 24) as T;
  }

  if (scope === 'studio' && resource === 'comments') {
    return listCommentsForStudio(store, params) as T;
  }

  if (scope === 'studio' && resource === 'settings') {
    return clone(store.settings) as T;
  }

  if (scope === 'studio' && resource === 'analytics' && idOrAction === 'stats') {
    return getAnalytics(store) as T;
  }

  throw new Error(`Unsupported demo GET path: ${path}`);
}

export async function demoPost<T, B = unknown>(
  path: string,
  payload?: B,
): Promise<T> {
  const store = loadStore();
  refreshRelations(store);
  const parts = splitPath(path);
  const [scope, resource, idOrAction, action] = parts;

  if (scope === 'public' && resource === 'analytics' && idOrAction === 'visit') {
    const today = new Date().toISOString().slice(0, 10);
    const day = store.dailyVisits.find((item) => item.date === today);
    if (day) day.count += 1;
    saveStore(store);
    return undefined as T;
  }

  if (scope === 'public' && resource === 'posts' && action === 'view') {
    const post = store.posts.find((item) => item.slug === idOrAction);
    if (!post) throw new Error('Post not found');
    post.viewCount += 1;
    saveStore(store);
    return { viewCount: post.viewCount, counted: true } as T;
  }

  if (scope === 'public' && resource === 'posts' && action === 'comments') {
    const body = payload as CreateCommentPayload;
    const post = store.posts.find((item) => item.id === Number(idOrAction));
    if (!post) throw new Error('Post not found');
    const createdAt = nowIso();
    const comment: Comment = {
      id: store.nextIds.comment,
      postId: post.id,
      parentId: body.parentId ?? null,
      authorName: body.authorName,
      authorEmail: body.authorEmail,
      content: body.content,
      status: 'APPROVED',
      createdAt,
      updatedAt: createdAt,
      post: { id: post.id, title: post.title, slug: post.slug },
      parent: body.parentId
        ? store.comments
            .filter((item) => item.id === body.parentId)
            .map((item) => ({ id: item.id, authorName: item.authorName }))[0] ?? null
        : null,
    };
    store.nextIds.comment += 1;
    store.comments.push(comment);
    saveStore(store);
    return clone(comment) as T;
  }

  if (scope === 'editor' && resource === 'posts' && !idOrAction) {
    const body = payload as CreatePostPayload;
    const createdAt = nowIso();
    const id = store.nextIds.post;
    store.nextIds.post += 1;
    const post: Post = {
      id,
      title: body.title || '새 초안',
      slug: normalizeSlug(body.slug || body.title || `draft-${id}`),
      content: body.content ?? '',
      excerpt: body.excerpt ?? null,
      coverImage: body.coverImage ?? null,
      status: body.status ?? 'DRAFT',
      viewCount: 0,
      metaTitle: body.metaTitle ?? null,
      metaDesc: body.metaDesc ?? null,
      tags: body.tags ?? null,
      scheduledAt: body.scheduledAt ?? null,
      publishedAt: null,
      createdAt,
      updatedAt: createdAt,
      seriesId: null,
      seriesOrder: null,
      categoryId: body.categoryId ?? null,
      category: null,
      series: null,
    };
    store.posts.unshift(post);
    saveStore(store);
    return clone(post) as T;
  }

  if (scope === 'studio' && resource === 'series' && !idOrAction) {
    const body = payload as CreateSeriesPayload;
    const createdAt = nowIso();
    const item: Series = {
      id: store.nextIds.series,
      title: body.title,
      slug: normalizeSlug(body.slug || body.title),
      description: body.description ?? null,
      coverImage: body.coverImage ?? '/demo-media/demo-series.svg',
      createdAt,
      updatedAt: createdAt,
      _count: { posts: 0 },
      posts: [],
    };
    store.nextIds.series += 1;
    store.series.unshift(item);
    saveStore(store);
    return clone(item) as T;
  }

  if (scope === 'studio' && resource === 'categories' && !idOrAction) {
    const body = payload as CreateCategoryPayload;
    const createdAt = nowIso();
    const item: Category = {
      id: store.nextIds.category,
      name: body.name,
      slug: normalizeSlug(body.slug || body.name),
      description: body.description ?? null,
      sortOrder: body.sortOrder ?? store.categories.length * 10,
      createdAt,
      updatedAt: createdAt,
      _count: { posts: 0 },
    };
    store.nextIds.category += 1;
    store.categories.push(item);
    saveStore(store);
    return clone(item) as T;
  }

  if (scope === 'studio' && resource === 'gallery' && idOrAction === 'batch') {
    const created = [
      createGalleryItem(store, payload as Partial<CreateGalleryItemPayload>),
    ];
    saveStore(store);
    return clone(created) as T;
  }

  if (scope === 'studio' && resource === 'gallery' && idOrAction && action === 'reprocess') {
    const item = store.gallery.find((entry) => entry.id === Number(idOrAction));
    if (!item) throw new Error('Gallery item not found');
    item.updatedAt = nowIso();
    saveStore(store);
    return clone(item) as T;
  }

  throw new Error(`Unsupported demo POST path: ${path}`);
}

export async function demoPatch<T, B = unknown>(
  path: string,
  payload?: B,
): Promise<T> {
  const store = loadStore();
  refreshRelations(store);
  const parts = splitPath(path);
  const [scope, resource, idOrAction, action] = parts;

  if ((scope === 'editor' || scope === 'studio') && resource === 'posts' && idOrAction) {
    const post = store.posts.find((item) => item.id === Number(idOrAction));
    if (!post) throw new Error('Post not found');

    if (action === 'transition') {
      transitionPost(post, payload as TransitionPostPayload);
    } else {
      Object.assign(post, payload as UpdatePostPayload, { updatedAt: nowIso() });
      if ((payload as UpdatePostPayload)?.title) {
        post.slug = (payload as UpdatePostPayload).slug ?? normalizeSlug(post.title);
      }
    }
    saveStore(store);
    return clone(post) as T;
  }

  if (scope === 'studio' && resource === 'categories' && idOrAction) {
    const item = store.categories.find((entry) => entry.id === Number(idOrAction));
    if (!item) throw new Error('Category not found');
    Object.assign(item, payload as UpdateCategoryPayload, { updatedAt: nowIso() });
    if ((payload as UpdateCategoryPayload)?.slug) {
      item.slug = normalizeSlug((payload as UpdateCategoryPayload).slug ?? item.name);
    }
    saveStore(store);
    return clone(item) as T;
  }

  if (scope === 'studio' && resource === 'series' && idOrAction) {
    const item = store.series.find((entry) => entry.id === Number(idOrAction));
    if (!item) throw new Error('Series not found');

    if (action === 'posts') {
      const postIds = ((payload as { postIds?: number[] })?.postIds ?? []);
      store.posts.forEach((post) => {
        if (post.seriesId === item.id && !postIds.includes(post.id)) {
          post.seriesId = null;
          post.seriesOrder = null;
        }
      });
      postIds.forEach((postId, index) => {
        const post = store.posts.find((entry) => entry.id === postId);
        if (post) {
          post.seriesId = item.id;
          post.seriesOrder = index + 1;
        }
      });
    } else {
      Object.assign(item, payload as UpdateSeriesPayload, { updatedAt: nowIso() });
      if ((payload as UpdateSeriesPayload)?.slug) {
        item.slug = normalizeSlug((payload as UpdateSeriesPayload).slug ?? item.title);
      }
    }
    saveStore(store);
    return clone(item) as T;
  }

  if (scope === 'studio' && resource === 'gallery' && idOrAction) {
    const item = store.gallery.find((entry) => entry.id === Number(idOrAction));
    if (!item) throw new Error('Gallery item not found');
    if (action === 'publish') {
      item.isPublished = !item.isPublished;
    } else {
      Object.assign(item, payload as UpdateGalleryItemPayload);
    }
    item.updatedAt = nowIso();
    saveStore(store);
    return clone(item) as T;
  }

  if (scope === 'studio' && resource === 'comments' && idOrAction && action === 'approve') {
    const item = store.comments.find((entry) => entry.id === Number(idOrAction));
    if (!item) throw new Error('Comment not found');
    item.status = 'APPROVED';
    item.updatedAt = nowIso();
    saveStore(store);
    return clone(item) as T;
  }

  if (scope === 'studio' && resource === 'settings') {
    const updated = upsertSettings(
      store,
      payload as {
        settings: Array<{ key: string; value: string | null | undefined }>;
      },
    );
    saveStore(store);
    return clone(updated) as T;
  }

  throw new Error(`Unsupported demo PATCH path: ${path}`);
}

export async function demoDelete<T>(path: string): Promise<T> {
  const store = loadStore();
  const parts = splitPath(path);
  const [scope, resource, idOrAction, action] = parts;

  if ((scope === 'editor' || scope === 'studio') && resource === 'posts' && idOrAction && action === 'cover-image') {
    const post = store.posts.find((item) => item.id === Number(idOrAction));
    if (!post) throw new Error('Post not found');
    post.coverImage = null;
    post.updatedAt = nowIso();
    saveStore(store);
    return clone(post) as T;
  }

  if (scope === 'studio' && resource === 'posts' && idOrAction) {
    store.posts = store.posts.filter((item) => item.id !== Number(idOrAction));
    store.comments = store.comments.filter((item) => item.postId !== Number(idOrAction));
    saveStore(store);
    return undefined as T;
  }

  if (scope === 'studio' && resource === 'categories' && idOrAction) {
    const id = Number(idOrAction);
    store.categories = store.categories.filter((item) => item.id !== id);
    store.posts.forEach((post) => {
      if (post.categoryId === id) post.categoryId = null;
    });
    saveStore(store);
    return undefined as T;
  }

  if (scope === 'studio' && resource === 'series' && idOrAction && action === 'cover-image') {
    const item = store.series.find((entry) => entry.id === Number(idOrAction));
    if (!item) throw new Error('Series not found');
    item.coverImage = null;
    item.updatedAt = nowIso();
    saveStore(store);
    return clone(item) as T;
  }

  if (scope === 'studio' && resource === 'series' && idOrAction) {
    const id = Number(idOrAction);
    store.series = store.series.filter((item) => item.id !== id);
    store.posts.forEach((post) => {
      if (post.seriesId === id) {
        post.seriesId = null;
        post.seriesOrder = null;
      }
    });
    saveStore(store);
    return undefined as T;
  }

  if (scope === 'studio' && resource === 'gallery' && idOrAction) {
    store.gallery = store.gallery.filter((item) => item.id !== Number(idOrAction));
    saveStore(store);
    return undefined as T;
  }

  if (scope === 'studio' && resource === 'comments' && idOrAction) {
    const id = Number(idOrAction);
    store.comments = store.comments.filter(
      (item) => item.id !== id && item.parentId !== id,
    );
    saveStore(store);
    return undefined as T;
  }

  throw new Error(`Unsupported demo DELETE path: ${path}`);
}

export async function demoUploadImage<T>(
  path: string,
  entries: FormEntries = {},
): Promise<T> {
  const parts = splitPath(path);
  const [scope, resource, idOrAction, action] = parts;

  if ((scope === 'editor' || scope === 'studio') && resource === 'posts' && idOrAction && action === 'cover-image') {
    return demoPatch<T, UpdatePostPayload>(path.replace(/\/cover-image$/, ''), {
      coverImage: '/demo-media/demo-cover.svg',
    });
  }

  if (scope === 'editor' && resource === 'posts' && idOrAction && action === 'content-image') {
    return { url: '/demo-media/demo-cover.svg' } as T;
  }

  if (scope === 'studio' && resource === 'series' && idOrAction && action === 'cover-image') {
    return demoPatch<T, UpdateSeriesPayload>(path.replace(/\/cover-image$/, ''), {
      coverImage: '/demo-media/demo-series.svg',
    });
  }

  if (scope === 'studio' && resource === 'settings' && idOrAction === 'media') {
    const key = action ?? 'about_nametag_image';
    const value =
      key === 'site_logo' || key === 'site_og_image'
        ? '/demo-media/demo-hero.svg'
        : '/demo-media/demo-nametag.svg';

    return demoPatch<T>(
      '/studio/settings',
      {
        settings: [
          {
            key,
            value,
          },
        ],
      },
    );
  }

  if (scope === 'studio' && resource === 'gallery') {
    const store = loadStore();
    const fileEntry = entries.image;
    const fileCount = Array.isArray(fileEntry) ? Math.max(1, fileEntry.length) : 1;
    const created = Array.from({ length: idOrAction === 'batch' ? fileCount : 1 }, (_, index) =>
      createGalleryItem(store, {
        title:
          fileCount > 1 && entries.title
            ? `${entries.title.toString()} ${index + 1}`
            : entries.title?.toString(),
        description: entries.description?.toString(),
        altText: entries.altText?.toString(),
        takenAt: entries.takenAt?.toString(),
        sortOrder:
          entries.sortOrder === undefined || entries.sortOrder === null
            ? undefined
            : Number(entries.sortOrder) + index,
      }),
    );
    saveStore(store);
    return clone(idOrAction === 'batch' ? created : created[0]) as T;
  }

  throw new Error(`Unsupported demo upload path: ${path}`);
}
