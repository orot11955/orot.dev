import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { ensureUniqueSlug, resolveBaseSlug } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AssignPostsDto } from './dto/assign-posts.dto';

const DEFAULT_SERIES_SLUG = 'series';

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSeriesDto) {
    const base = resolveBaseSlug(DEFAULT_SERIES_SLUG, dto.slug, dto.title);
    const slug = await this.ensureUniqueSlug(base);

    return this.prisma.series.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        coverImage: dto.coverImage,
      },
      include: { _count: { select: { posts: true } } },
    });
  }

  async findAll() {
    return this.prisma.series.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { posts: true } },
        posts: {
          where: { status: PostStatus.PUBLISHED },
          orderBy: { seriesOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            publishedAt: true,
            seriesOrder: true,
          },
        },
      },
    });
  }

  async findAllPublic() {
    return this.prisma.series.findMany({
      where: {
        posts: {
          some: { status: PostStatus.PUBLISHED },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: {
              where: { status: PostStatus.PUBLISHED },
            },
          },
        },
      },
    });
  }

  async findOne(idOrSlug: string | number) {
    const where =
      typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug };

    const series = await this.prisma.series.findUnique({
      where,
      include: {
        posts: {
          orderBy: { seriesOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            seriesOrder: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!series) throw new NotFoundException('Series not found');
    return series;
  }

  async findOnePublic(slug: string) {
    const series = await this.prisma.series.findUnique({
      where: { slug },
      include: {
        posts: {
          where: { status: PostStatus.PUBLISHED },
          orderBy: { seriesOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            publishedAt: true,
            seriesOrder: true,
          },
        },
      },
    });

    if (!series) throw new NotFoundException('Series not found');
    return series;
  }

  async update(id: number, dto: UpdateSeriesDto) {
    await this.findOne(id);
    const data: UpdateSeriesDto & { slug?: string } = { ...dto };
    if (dto.slug !== undefined) {
      const base = resolveBaseSlug(DEFAULT_SERIES_SLUG, dto.slug);
      data.slug = await this.ensureUniqueSlug(base, id);
    }

    return this.prisma.series.update({
      where: { id },
      data,
      include: { _count: { select: { posts: true } } },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.series.delete({ where: { id } });
    return { message: 'Series deleted' };
  }

  async assignPosts(id: number, dto: AssignPostsDto) {
    await this.findOne(id);
    const uniquePostIds = Array.from(new Set(dto.postIds));

    if (uniquePostIds.length !== dto.postIds.length) {
      throw new BadRequestException('Duplicate postIds are not allowed');
    }

    // Verify all posts exist and are PUBLISHED
    const posts = await this.prisma.post.findMany({
      where: { id: { in: uniquePostIds } },
      select: { id: true, status: true },
    });

    if (posts.length !== uniquePostIds.length) {
      const foundIds = new Set(posts.map((post) => post.id));
      const missingIds = uniquePostIds.filter(
        (postId) => !foundIds.has(postId),
      );

      throw new BadRequestException(
        `Posts not found: ${missingIds.join(', ')}`,
      );
    }

    const nonPublished = posts.filter((p) => p.status !== PostStatus.PUBLISHED);
    if (nonPublished.length > 0) {
      throw new BadRequestException(
        'Only PUBLISHED posts can be added to a series',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.post.updateMany({
        where: { seriesId: id, id: { notIn: uniquePostIds } },
        data: { seriesId: null, seriesOrder: null },
      });

      await Promise.all(
        uniquePostIds.map((postId, index) =>
          tx.post.update({
            where: { id: postId },
            data: { seriesId: id, seriesOrder: index + 1 },
          }),
        ),
      );
    });

    return this.findOne(id);
  }

  private async ensureUniqueSlug(
    base: string,
    excludeId?: number,
  ): Promise<string> {
    return ensureUniqueSlug({
      base,
      defaultSlug: DEFAULT_SERIES_SLUG,
      excludeId,
      findBySlug: (slug) =>
        this.prisma.series.findUnique({
          where: { slug },
          select: { id: true },
        }),
    });
  }
}
