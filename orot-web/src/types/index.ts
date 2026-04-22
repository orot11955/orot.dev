// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

export type PostStatus =
  | 'DRAFT'
  | 'COMPLETED'
  | 'REVIEW'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'UPDATED'
  | 'ARCHIVED';

export type PostSort = 'latest' | 'popular';

export type Theme = 'light' | 'dark' | 'sepia' | 'forest' | 'ocean';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: Pick<User, 'id' | 'username' | 'role'>;
}

export interface LoginPayload {
  username: string;
  password: string;
}

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  status: PostStatus;
  viewCount: number;
  metaTitle: string | null;
  metaDesc: string | null;
  tags: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  seriesId: number | null;
  seriesOrder: number | null;
  series?: SeriesSummary | null;
  categoryId?: number | null;
  category?: CategorySummary | null;
}

export interface SeriesSummary {
  id: number;
  title: string;
  slug: string;
}

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
}

export type PostListItem = Omit<Post, 'content' | 'metaTitle' | 'metaDesc'>;

export interface PostDetail extends Post {
  prev?: PostNeighbor | null;
  next?: PostNeighbor | null;
}

export interface PostNeighbor {
  id: number;
  title: string;
  slug: string;
}

export interface PostListResponse {
  data: PostListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PostQuery {
  page?: number;
  limit?: number;
  status?: PostStatus;
  search?: string;
  tag?: string;
  seriesId?: number;
  categoryId?: number;
  categorySlug?: string;
  sort?: PostSort;
}

export interface CreatePostPayload {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  coverImage?: string | null;
  status?: PostStatus;
  metaTitle?: string;
  metaDesc?: string;
  tags?: string;
  scheduledAt?: string;
  categoryId?: number | null;
}

export type UpdatePostPayload = Partial<CreatePostPayload>;

export interface TransitionPostPayload {
  status: PostStatus;
  scheduledAt?: string;
}

// ─── Series ───────────────────────────────────────────────────────────────────

export interface Series {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  posts?: SeriesPostSummary[];
  _count?: {
    posts: number;
  };
}

export interface SeriesPostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  status?: PostStatus;
  publishedAt?: string | null;
  seriesOrder?: number | null;
}

export interface CreateSeriesPayload {
  title: string;
  slug?: string;
  description?: string;
  coverImage?: string | null;
}

export type UpdateSeriesPayload = Partial<CreateSeriesPayload>;

export interface AssignPostsPayload {
  postIds: number[];
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts: number;
  };
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'APPROVED' | 'PENDING' | 'FILTERED';
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  post?: {
    id: number;
    title: string;
    slug: string;
  };
  parent?: {
    id: number;
    authorName: string;
  } | null;
}

export interface CreateCommentPayload {
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: number;
}

export interface CommentQuery {
  page?: number;
  limit?: number;
  status?: 'APPROVED' | 'PENDING' | 'FILTERED';
  postId?: number;
}

export interface CommentListResponse {
  data: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export interface GalleryItem {
  id: number;
  title: string | null;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type GallerySort =
  | 'manual'
  | 'takenAtDesc'
  | 'takenAtAsc'
  | 'createdAtDesc';

export interface CreateGalleryItemPayload {
  title?: string;
  description?: string;
  altText?: string;
  takenAt?: string;
  sortOrder?: number;
}

export interface UpdateGalleryItemPayload {
  title?: string;
  description?: string;
  altText?: string;
  takenAt?: string | null;
  sortOrder?: number;
}

export interface GalleryQuery {
  page?: number;
  limit?: number;
  search?: string;
  isPublished?: boolean;
  sort?: GallerySort;
}

export interface GalleryListResponse {
  data: GalleryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SiteSetting {
  key: string;
  value: string;
}

export interface PublicSettings {
  site_name: string;
  site_description: string;
  site_og_image: string;
  site_logo: string;
  seo_home_title: string;
  seo_home_description: string;
  home_hero_image: string;
  about_content: string;
  about_stack: string;  // 쉼표(,)로 구분된 기술 스택
  about_resume: string;
  about_links: string;  // "레이블|URL" 형식, 줄바꿈으로 구분
  about_nametag_image: string;
  public_menu: string;  // JSON 문자열: PublicMenuItem[]
  default_theme: string;
  allow_theme_switch: string;  // 'true' | 'false'
  social_links: string;  // JSON 문자열: SocialLinkItem[]
  seo_robots: string;
  enable_sitemap: string;
  enable_rss: string;
  [key: string]: string;
}

export interface StudioSettings extends PublicSettings {
  filter_keywords: string;
  [key: string]: string;
}

export interface PublicMenuItem {
  key: string;
  label: string;
  href: string;
  enabled: boolean;
}

export interface SocialLinkItem {
  label: string;
  url: string;
  icon?: string;
}

export interface UpdateSettingsPayload {
  [key: string]: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsStats {
  visitors: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  topPosts: Array<{
    id: number;
    title: string;
    slug: string;
    viewCount: number;
  }>;
  dailyVisits: Array<{
    date: string;
    count: number;
  }>;
  postStatusDistribution: Array<{
    status: PostStatus;
    count: number;
  }>;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiError {
  success?: false;
  statusCode: number;
  message: string | string[];
  path?: string;
  error?: string;
  timestamp?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
  requestId: string;
}

export interface ApiListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiListPayload<T> {
  items: T[];
  meta: ApiListMeta;
}
