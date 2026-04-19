import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AssignPostsDto } from './dto/assign-posts.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSeriesDto) {
    const base = dto.slug ? slugify(dto.slug) : slugify(dto.title);
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
      include: {
        _count: {
          select: {
            posts: {
              where: { status: PostStatus.PUBLISHED },
            },
          },
        },
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
    if (dto.slug) data.slug = slugify(dto.slug);

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

    // Verify all posts exist and are PUBLISHED
    const posts = await this.prisma.post.findMany({
      where: { id: { in: dto.postIds } },
      select: { id: true, status: true },
    });

    const nonPublished = posts.filter((p) => p.status !== PostStatus.PUBLISHED);
    if (nonPublished.length > 0) {
      throw new BadRequestException(
        'Only PUBLISHED posts can be added to a series',
      );
    }

    // Detach posts previously in this series
    await this.prisma.post.updateMany({
      where: { seriesId: id, id: { notIn: dto.postIds } },
      data: { seriesId: null, seriesOrder: null },
    });

    // Assign posts with order
    for (let i = 0; i < dto.postIds.length; i++) {
      await this.prisma.post.update({
        where: { id: dto.postIds[i] },
        data: { seriesId: id, seriesOrder: i + 1 },
      });
    }

    return this.findOne(id);
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let count = 0;

    while (true) {
      const existing = await this.prisma.series.findUnique({ where: { slug } });
      if (!existing) return slug;
      count++;
      slug = `${base}-${count}`;
    }
  }
}
