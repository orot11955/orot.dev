import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ensureUniqueSlug, resolveBaseSlug } from '../common/slug';
import {
  ALLOWED_IMAGE_MIME,
  resolveUploadsDiskPath,
  safeRemoveUploadedAsset,
  toUploadsPublicUrl,
} from '../common/uploads';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { TransitionPostDto } from './dto/transition-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const VALID_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  DRAFT: ['COMPLETED'],
  COMPLETED: ['REVIEW', 'DRAFT'],
  REVIEW: ['SCHEDULED', 'PUBLISHED', 'DRAFT'],
  SCHEDULED: ['PUBLISHED', 'DRAFT'],
  PUBLISHED: ['UPDATED', 'ARCHIVED'],
  UPDATED: ['REVIEW'],
  ARCHIVED: ['REVIEW'],
};

type PostArea = 'public' | 'editor' | 'studio';
type InternalArea = Exclude<PostArea, 'public'>;
type PostNeighbor = {
  id: number;
  title: string;
  slug: string;
};
type PublicViewResult = {
  postId: number;
  viewCount: number;
  counted: boolean;
};
type CachedTags = {
  value: string[];
  expiresAt: number;
};
type PublicNeighborSource = {
  id: number;
  seriesId: number | null;
  seriesOrder: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

const AREA_VISIBLE_STATUSES: Record<InternalArea, PostStatus[]> = {
  editor: ['DRAFT', 'COMPLETED', 'REVIEW', 'UPDATED'],
  studio: ['REVIEW', 'UPDATED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'],
};

const AREA_TRANSITIONS: Record<
  InternalArea,
  Partial<Record<PostStatus, PostStatus[]>>
> = {
  editor: {
    DRAFT: ['COMPLETED'],
    COMPLETED: ['REVIEW', 'DRAFT'],
    REVIEW: ['DRAFT'],
    UPDATED: ['REVIEW'],
  },
  studio: {
    REVIEW: ['SCHEDULED', 'PUBLISHED', 'DRAFT'],
    UPDATED: ['REVIEW'],
    SCHEDULED: ['PUBLISHED', 'DRAFT'],
    PUBLISHED: ['UPDATED', 'ARCHIVED'],
    ARCHIVED: ['REVIEW'],
  },
};

const DEFAULT_POST_SLUG = 'post';
const PUBLIC_TAG_CACHE_TTL_MS = 60_000;
const POST_CONTENT_IMAGE_UPLOAD_PREFIX = '/uploads/posts/content/';
const MAX_POST_CONTENT_IMAGE_BYTES = 50 * 1024 * 1024;
const DATA_IMAGE_URL_PATTERN =
  /data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([a-z0-9+/=\r\n]+)(?=[)\s"'<>]|$)/gi;
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]*)\)/g;
const HTML_IMAGE_WITH_ALT_PATTERN =
  /<img\b(?=[^>]*\balt=(["'])(.*?)\1)[^>]*>/gi;
const HTML_IMAGE_PATTERN = /<img\b[^>]*>/gi;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]*)\)/g;

type PreparedPostContent = {
  content: string;
  uploadedPaths: string[];
};

function createPostSearchFilters(search: string) {
  return [
    { title: { contains: search } },
    { slug: { contains: search } },
    { searchText: { contains: search } },
    { excerpt: { contains: search } },
    { tags: { contains: search } },
    { series: { is: { title: { contains: search } } } },
    { series: { is: { slug: { contains: search } } } },
    { category: { is: { name: { contains: search } } } },
    { category: { is: { slug: { contains: search } } } },
  ];
}

function normalizeSearchWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function createPostSearchText(content: string): string {
  return normalizeSearchWhitespace(
    content
      .replace(MARKDOWN_IMAGE_PATTERN, (_match, alt) => ` ${alt ?? ''} `)
      .replace(
        HTML_IMAGE_WITH_ALT_PATTERN,
        (_match, _quote, alt) => ` ${alt ?? ''} `,
      )
      .replace(HTML_IMAGE_PATTERN, ' ')
      .replace(DATA_IMAGE_URL_PATTERN, ' ')
      .replace(MARKDOWN_LINK_PATTERN, (_match, label) => ` ${label ?? ''} `)
      .replace(/[`*_>#~|[\](){}.!,:;"'\\/=-]+/g, ' '),
  );
}

function normalizeImageMime(mime: string): (typeof ALLOWED_IMAGE_MIME)[number] {
  return mime.toLowerCase() === 'image/jpg'
    ? 'image/jpeg'
    : (mime.toLowerCase() as (typeof ALLOWED_IMAGE_MIME)[number]);
}

function extensionForImageMime(mime: (typeof ALLOWED_IMAGE_MIME)[number]) {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
  }
}

function normalizeManagedContentImagePath(value: string): string | null {
  const trimmed = value.trim();
  const pathname = (() => {
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        return new URL(trimmed).pathname;
      } catch {
        return '';
      }
    }

    return trimmed;
  })();

  return pathname.startsWith(POST_CONTENT_IMAGE_UPLOAD_PREFIX)
    ? pathname
    : null;
}

function extractManagedContentImagePaths(content?: string | null): string[] {
  if (!content) {
    return [];
  }

  const paths = new Set<string>();

  for (const match of content.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    const path = normalizeManagedContentImagePath(match[2] ?? '');
    if (path) paths.add(path);
  }

  const htmlImageSourcePattern = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;
  for (const match of content.matchAll(htmlImageSourcePattern)) {
    const path = normalizeManagedContentImagePath(match[2] ?? '');
    if (path) paths.add(path);
  }

  return Array.from(paths);
}

function removeUploadedPaths(paths: Iterable<string>) {
  for (const path of paths) {
    safeRemoveUploadedAsset(path, POST_CONTENT_IMAGE_UPLOAD_PREFIX);
  }
}

@Injectable()
export class PostsService implements OnModuleInit {
  private cachedTags: CachedTags | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.backfillSearchTextAndInlineImages();
  }

  async create(dto: CreatePostDto) {
    const slug = this.resolveBaseSlug(dto.slug, dto.title);
    const uniqueSlug = await this.ensureUniqueSlug(slug);
    const preparedContent = this.preparePostContentForStorage(dto.content);

    if (dto.categoryId != null) {
      await this.assertCategoryExists(dto.categoryId);
    }

    try {
      const created = await this.prisma.post.create({
        data: {
          title: dto.title,
          slug: uniqueSlug,
          content: preparedContent.content,
          searchText: createPostSearchText(preparedContent.content),
          excerpt: dto.excerpt,
          coverImage: dto.coverImage,
          status: dto.status ?? PostStatus.DRAFT,
          metaTitle: dto.metaTitle,
          metaDesc: dto.metaDesc,
          tags: dto.tags,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          categoryId: dto.categoryId ?? null,
        },
        include: {
          series: { select: { id: true, title: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.invalidatePublicTagCache();
      return created;
    } catch (error) {
      removeUploadedPaths(preparedContent.uploadedPaths);
      throw error;
    }
  }

  async findAll(query: QueryPostDto, area: PostArea) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      tag,
      seriesId,
      categoryId,
      categorySlug,
      sort = 'latest',
    } = query;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    const orderBy =
      sort === 'popular'
        ? [
            { viewCount: 'desc' as const },
            { publishedAt: 'desc' as const },
            { updatedAt: 'desc' as const },
            { createdAt: 'desc' as const },
          ]
        : [
            { publishedAt: 'desc' as const },
            { updatedAt: 'desc' as const },
            { createdAt: 'desc' as const },
          ];

    if (area === 'public') {
      where.status = PostStatus.PUBLISHED;
    } else if (status) {
      this.assertAreaStatus(area, status);
      where.status = status;
    } else {
      where.status = { in: AREA_VISIBLE_STATUSES[area] };
    }

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      where.OR = createPostSearchFilters(normalizedSearch);
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    if (seriesId) {
      where.seriesId = seriesId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    const [total, items] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          status: true,
          viewCount: true,
          tags: true,
          publishedAt: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          seriesId: true,
          seriesOrder: true,
          categoryId: true,
          series: { select: { id: true, title: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllTags(): Promise<string[]> {
    const cached = this.getCachedPublicTags();
    if (cached) {
      return cached;
    }

    const posts = await this.prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED, tags: { not: null } },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const post of posts) {
      if (!post.tags) continue;
      for (const tag of post.tags.split(',')) {
        const trimmed = tag.trim();
        if (trimmed) tagSet.add(trimmed);
      }
    }

    return this.setCachedPublicTags(Array.from(tagSet).sort());
  }

  async findOne(idOrSlug: string | number, isPublic = false) {
    return this.findOneForArea(idOrSlug, isPublic ? 'public' : 'studio');
  }

  async findOneForArea(idOrSlug: string | number, area: PostArea) {
    const where =
      typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug };

    const post = await this.prisma.post.findUnique({
      where,
      include: {
        series: { select: { id: true, title: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (area === 'public' && post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('Post not found');
    }
    if (
      area !== 'public' &&
      !AREA_VISIBLE_STATUSES[area].includes(post.status)
    ) {
      throw new NotFoundException('Post not found');
    }

    if (area === 'public') {
      const neighbors = await this.getPublicNeighbors(post);

      return {
        ...post,
        ...neighbors,
      };
    }

    return post;
  }

  async recordPublicView(
    slug: string,
    viewedPostIds?: ReadonlySet<number>,
  ): Promise<PublicViewResult> {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        viewCount: true,
      },
    });

    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('Post not found');
    }

    if (viewedPostIds?.has(post.id)) {
      return {
        postId: post.id,
        viewCount: post.viewCount,
        counted: false,
      };
    }

    await this.prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      postId: post.id,
      viewCount: post.viewCount + 1,
      counted: true,
    };
  }

  async update(id: number, dto: UpdatePostDto, area: InternalArea) {
    const currentPost = await this.findOneForArea(id, area);
    const data: Record<string, unknown> = { ...dto };
    let preparedContent: PreparedPostContent | null = null;

    if (dto.content !== undefined) {
      preparedContent = this.preparePostContentForStorage(
        dto.content,
        `post-${id}`,
      );
      data.content = preparedContent.content;
      data.searchText = createPostSearchText(preparedContent.content);
    }

    if (dto.slug !== undefined) {
      const slug = this.resolveBaseSlug(dto.slug);
      data.slug = await this.ensureUniqueSlug(slug, id);
    }
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        data.categoryId = null;
      } else {
        await this.assertCategoryExists(dto.categoryId);
        data.categoryId = dto.categoryId;
      }
    }

    try {
      const updated = await this.prisma.post.update({
        where: { id },
        data,
        include: {
          series: { select: { id: true, title: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      if (preparedContent) {
        this.removeUnreferencedContentImages(
          currentPost.content,
          preparedContent.content,
        );
      }

      this.invalidatePublicTagCache();
      return updated;
    } catch (error) {
      removeUploadedPaths(preparedContent?.uploadedPaths ?? []);
      throw error;
    }
  }

  async transition(id: number, dto: TransitionPostDto, area: InternalArea) {
    const post = await this.findOneForArea(id, area);
    const allowed = VALID_TRANSITIONS[post.status] ?? [];
    const areaAllowed = AREA_TRANSITIONS[area][post.status] ?? [];

    if (!allowed.includes(dto.status) || !areaAllowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${post.status} to ${dto.status}`,
      );
    }

    const data: Record<string, unknown> = { status: dto.status };

    if (dto.status === PostStatus.SCHEDULED) {
      if (!dto.scheduledAt) {
        throw new BadRequestException('scheduledAt is required for SCHEDULED');
      }
      const scheduledAt = new Date(dto.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        throw new BadRequestException('scheduledAt must be a future date');
      }
      data.scheduledAt = scheduledAt;
    }

    if (dto.status === PostStatus.PUBLISHED) {
      if (!post.publishedAt) {
        data.publishedAt = new Date();
      }
      data.scheduledAt = null;
    }

    if (dto.status === PostStatus.DRAFT) {
      data.scheduledAt = null;
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data,
      include: {
        series: { select: { id: true, title: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.invalidatePublicTagCache();
    return updated;
  }

  async remove(id: number) {
    const post = await this.findOneForArea(id, 'studio');
    await this.prisma.post.delete({ where: { id } });
    removeUploadedPaths(extractManagedContentImagePaths(post.content));
    this.invalidatePublicTagCache();
    return { message: 'Post deleted' };
  }

  invalidatePublicTagCache() {
    this.cachedTags = null;
  }

  private resolveBaseSlug(
    ...candidates: Array<string | null | undefined>
  ): string {
    return resolveBaseSlug(DEFAULT_POST_SLUG, ...candidates);
  }

  private async ensureUniqueSlug(
    base: string,
    excludeId?: number,
  ): Promise<string> {
    return ensureUniqueSlug({
      base,
      defaultSlug: DEFAULT_POST_SLUG,
      excludeId,
      findBySlug: (slug) =>
        this.prisma.post.findUnique({
          where: { slug },
          select: { id: true },
        }),
    });
  }

  private async assertCategoryExists(id: number) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) {
      throw new BadRequestException(`Category ${id} does not exist`);
    }
  }

  private assertAreaStatus(area: InternalArea, status: PostStatus) {
    if (!AREA_VISIBLE_STATUSES[area].includes(status)) {
      throw new BadRequestException(`${status} is not available in ${area}`);
    }
  }

  private getCachedPublicTags(): string[] | null {
    if (this.cachedTags && this.cachedTags.expiresAt > Date.now()) {
      return this.cachedTags.value;
    }

    this.cachedTags = null;
    return null;
  }

  private setCachedPublicTags(value: string[]): string[] {
    this.cachedTags = {
      value,
      expiresAt: Date.now() + PUBLIC_TAG_CACHE_TTL_MS,
    };

    return value;
  }

  private async backfillSearchTextAndInlineImages() {
    const posts = await this.prisma.post.findMany({
      where: {
        OR: [{ searchText: null }, { content: { contains: 'data:image/' } }],
      },
      select: { id: true, content: true },
    });

    for (const post of posts) {
      const preparedContent = this.preparePostContentForStorage(
        post.content,
        `post-${post.id}`,
      );

      try {
        await this.prisma.post.update({
          where: { id: post.id },
          data: {
            ...(preparedContent.content !== post.content
              ? { content: preparedContent.content }
              : {}),
            searchText: createPostSearchText(preparedContent.content),
          },
        });
      } catch (error) {
        removeUploadedPaths(preparedContent.uploadedPaths);
        throw error;
      }
    }
  }

  private preparePostContentForStorage(
    content: string,
    filenamePrefix = 'post-content',
  ): PreparedPostContent {
    const uploadedPaths: string[] = [];
    const uploadDir = resolveUploadsDiskPath('posts', 'content');
    mkdirSync(uploadDir, { recursive: true });

    try {
      const nextContent = content.replace(
        DATA_IMAGE_URL_PATTERN,
        (match, rawMime: string, rawBase64: string) => {
          const mime = normalizeImageMime(rawMime);
          if (!ALLOWED_IMAGE_MIME.includes(mime)) {
            return match;
          }

          const buffer = Buffer.from(rawBase64.replace(/\s/g, ''), 'base64');
          if (buffer.length <= 0) {
            return match;
          }

          if (buffer.length > MAX_POST_CONTENT_IMAGE_BYTES) {
            throw new BadRequestException('Post content image is too large');
          }

          const filename = `${filenamePrefix}-${Date.now()}-${randomUUID()}.${extensionForImageMime(mime)}`;
          const filePath = join(uploadDir, filename);
          writeFileSync(filePath, buffer);

          const publicPath = toUploadsPublicUrl('posts', 'content', filename);
          uploadedPaths.push(publicPath);
          return publicPath;
        },
      );

      return { content: nextContent, uploadedPaths };
    } catch (error) {
      removeUploadedPaths(uploadedPaths);
      throw error;
    }
  }

  private removeUnreferencedContentImages(
    previousContent: string,
    nextContent: string,
  ) {
    const nextPaths = new Set(extractManagedContentImagePaths(nextContent));
    const stalePaths = extractManagedContentImagePaths(previousContent).filter(
      (path) => !nextPaths.has(path),
    );

    removeUploadedPaths(stalePaths);
  }

  private async getPublicNeighbors(
    post: PublicNeighborSource,
  ): Promise<{ prev: PostNeighbor | null; next: PostNeighbor | null }> {
    if (post.seriesId && post.seriesOrder != null) {
      const [prev, next] = await Promise.all([
        this.prisma.post.findFirst({
          where: {
            status: PostStatus.PUBLISHED,
            seriesId: post.seriesId,
            seriesOrder: { lt: post.seriesOrder },
          },
          orderBy: [
            { seriesOrder: 'desc' },
            { publishedAt: 'asc' },
            { updatedAt: 'asc' },
            { createdAt: 'asc' },
          ],
          select: {
            id: true,
            title: true,
            slug: true,
          },
        }),
        this.prisma.post.findFirst({
          where: {
            status: PostStatus.PUBLISHED,
            seriesId: post.seriesId,
            seriesOrder: { gt: post.seriesOrder },
          },
          orderBy: [
            { seriesOrder: 'asc' },
            { publishedAt: 'desc' },
            { updatedAt: 'desc' },
            { createdAt: 'desc' },
          ],
          select: {
            id: true,
            title: true,
            slug: true,
          },
        }),
      ]);

      return { prev, next };
    }

    if (!post.publishedAt) {
      return this.getPublicNeighborsFallback(post);
    }

    const [prev, next] = await Promise.all([
      this.prisma.post.findFirst({
        where: {
          status: PostStatus.PUBLISHED,
          OR: [
            { publishedAt: { gt: post.publishedAt } },
            {
              publishedAt: post.publishedAt,
              updatedAt: { gt: post.updatedAt },
            },
            {
              publishedAt: post.publishedAt,
              updatedAt: post.updatedAt,
              createdAt: { gt: post.createdAt },
            },
          ],
        },
        orderBy: [
          { publishedAt: 'asc' },
          { updatedAt: 'asc' },
          { createdAt: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
        },
      }),
      this.prisma.post.findFirst({
        where: {
          status: PostStatus.PUBLISHED,
          OR: [
            { publishedAt: { lt: post.publishedAt } },
            {
              publishedAt: post.publishedAt,
              updatedAt: { lt: post.updatedAt },
            },
            {
              publishedAt: post.publishedAt,
              updatedAt: post.updatedAt,
              createdAt: { lt: post.createdAt },
            },
          ],
        },
        orderBy: [
          { publishedAt: 'desc' },
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
        },
      }),
    ]);

    return { prev, next };
  }

  private async getPublicNeighborsFallback(
    post: Pick<PublicNeighborSource, 'id' | 'seriesId'>,
  ): Promise<{ prev: PostNeighbor | null; next: PostNeighbor | null }> {
    if (post.seriesId) {
      const seriesPosts = await this.prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
          seriesId: post.seriesId,
        },
        orderBy: [
          { seriesOrder: 'asc' },
          { publishedAt: 'desc' },
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
        },
      });

      const currentIndex = seriesPosts.findIndex((item) => item.id === post.id);
      if (currentIndex !== -1) {
        return {
          prev: seriesPosts[currentIndex - 1] ?? null,
          next: seriesPosts[currentIndex + 1] ?? null,
        };
      }
    }

    const publishedPosts = await this.prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: [
        { publishedAt: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });

    const currentIndex = publishedPosts.findIndex(
      (item) => item.id === post.id,
    );
    if (currentIndex === -1) {
      return { prev: null, next: null };
    }

    return {
      prev: publishedPosts[currentIndex - 1] ?? null,
      next: publishedPosts[currentIndex + 1] ?? null,
    };
  }
}
