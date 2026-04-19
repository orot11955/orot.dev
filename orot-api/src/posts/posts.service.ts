import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus } from '@prisma/client';
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

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s_-]+/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePostDto) {
    const slug = this.resolveBaseSlug(dto.slug, dto.title);
    const uniqueSlug = await this.ensureUniqueSlug(slug);

    return this.prisma.post.create({
      data: {
        title: dto.title,
        slug: uniqueSlug,
        content: dto.content,
        excerpt: dto.excerpt,
        coverImage: dto.coverImage,
        status: dto.status ?? PostStatus.DRAFT,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        tags: dto.tags,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: {
        series: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async findAll(query: QueryPostDto, area: PostArea) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      tag,
      seriesId,
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

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { excerpt: { contains: search } },
      ];
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    if (seriesId) {
      where.seriesId = seriesId;
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
          series: { select: { id: true, title: true, slug: true } },
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

    return Array.from(tagSet).sort();
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
    await this.findOneForArea(id, area);
    const data: Record<string, unknown> = { ...dto };
    if (dto.slug !== undefined) {
      const slug = this.resolveBaseSlug(dto.slug);
      data.slug = await this.ensureUniqueSlug(slug, id);
    }
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);

    return this.prisma.post.update({
      where: { id },
      data,
      include: {
        series: { select: { id: true, title: true, slug: true } },
      },
    });
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
      data.publishedAt = new Date();
      data.scheduledAt = null;
    }

    if (dto.status === PostStatus.DRAFT) {
      data.scheduledAt = null;
    }

    return this.prisma.post.update({
      where: { id },
      data,
      include: {
        series: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async remove(id: number) {
    await this.prisma.post.findUnique({ where: { id } });
    await this.prisma.post.delete({ where: { id } });
    return { message: 'Post deleted' };
  }

  private resolveBaseSlug(...candidates: Array<string | null | undefined>): string {
    for (const candidate of candidates) {
      const normalized = slugify(candidate ?? '');
      if (normalized) {
        return normalized;
      }
    }

    return DEFAULT_POST_SLUG;
  }

  private async ensureUniqueSlug(
    base: string,
    excludeId?: number,
  ): Promise<string> {
    const normalizedBase = base.trim() || DEFAULT_POST_SLUG;
    let slug = normalizedBase;
    let count = 0;

    while (true) {
      const existing = await this.prisma.post.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      count += 1;
      slug = `${normalizedBase}-${count}`;
    }
  }

  private assertAreaStatus(area: InternalArea, status: PostStatus) {
    if (!AREA_VISIBLE_STATUSES[area].includes(status)) {
      throw new BadRequestException(`${status} is not available in ${area}`);
    }
  }

  private async getPublicNeighbors(post: {
    id: number;
    seriesId: number | null;
  }): Promise<{ prev: PostNeighbor | null; next: PostNeighbor | null }> {
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

    const currentIndex = publishedPosts.findIndex((item) => item.id === post.id);
    if (currentIndex === -1) {
      return { prev: null, next: null };
    }

    return {
      prev: publishedPosts[currentIndex - 1] ?? null,
      next: publishedPosts[currentIndex + 1] ?? null,
    };
  }
}
