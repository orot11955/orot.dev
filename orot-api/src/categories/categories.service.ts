import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const DEFAULT_CATEGORY_SLUG = 'category';

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
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const base = this.resolveBaseSlug(dto.slug, dto.name);
    const slug = await this.ensureUniqueSlug(base);

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { _count: { select: { posts: true } } },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: true } } },
    });
  }

  async findAllPublic() {
    return this.prisma.category.findMany({
      where: {
        posts: { some: { status: PostStatus.PUBLISHED } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            posts: { where: { status: PostStatus.PUBLISHED } },
          },
        },
      },
    });
  }

  async findOne(idOrSlug: string | number) {
    const where =
      typeof idOrSlug === 'number' ? { id: idOrSlug } : { slug: idOrSlug };

    const category = await this.prisma.category.findUnique({
      where,
      include: { _count: { select: { posts: true } } },
    });

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = { ...dto };

    if (dto.slug !== undefined) {
      const base = this.resolveBaseSlug(dto.slug);
      data.slug = await this.ensureUniqueSlug(base, id);
    }

    return this.prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { posts: true } } },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  private resolveBaseSlug(
    ...candidates: Array<string | null | undefined>
  ): string {
    for (const candidate of candidates) {
      const normalized = slugify(candidate ?? '');
      if (normalized) return normalized;
    }
    return DEFAULT_CATEGORY_SLUG;
  }

  private async ensureUniqueSlug(
    base: string,
    excludeId?: number,
  ): Promise<string> {
    const normalizedBase = base.trim() || DEFAULT_CATEGORY_SLUG;
    let slug = normalizedBase;
    let count = 0;

    while (true) {
      const existing = await this.prisma.category.findUnique({
        where: { slug },
      });
      if (!existing || existing.id === excludeId) return slug;
      count += 1;
      slug = `${normalizedBase}-${count}`;
    }
  }

  async assertExists(id: number) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) {
      throw new BadRequestException(`Category ${id} does not exist`);
    }
  }
}
