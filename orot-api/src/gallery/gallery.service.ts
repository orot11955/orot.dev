import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { UpdateGalleryItemDto } from './dto/update-gallery-item.dto';
import { QueryGalleryDto, type GallerySort } from './dto/query-gallery.dto';

interface CreateGalleryItemInput {
  dto: CreateGalleryItemDto;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

function resolveGalleryOrderBy(
  sort: GallerySort | undefined,
): Prisma.GalleryItemOrderByWithRelationInput[] {
  switch (sort) {
    case 'takenAtDesc':
      return [
        { takenAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ];
    case 'takenAtAsc':
      return [
        { takenAt: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ];
    case 'createdAtDesc':
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    case 'manual':
    default:
      return [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }];
  }
}

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  private buildCreateData({
    dto,
    imageUrl,
    thumbnailUrl,
    width,
    height,
  }: CreateGalleryItemInput): Prisma.GalleryItemCreateInput {
    return {
      title: dto.title,
      description: dto.description,
      altText: dto.altText,
      imageUrl,
      thumbnailUrl: thumbnailUrl ?? imageUrl,
      width,
      height,
      takenAt: dto.takenAt ? new Date(dto.takenAt) : undefined,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: false,
    };
  }

  async create(
    dto: CreateGalleryItemDto,
    imageUrl: string,
    thumbnailUrl?: string,
    width?: number,
    height?: number,
  ) {
    return this.prisma.galleryItem.create({
      data: this.buildCreateData({
        dto,
        imageUrl,
        thumbnailUrl,
        width,
        height,
      }),
    });
  }

  async createMany(inputs: CreateGalleryItemInput[]) {
    if (inputs.length === 0) {
      return [];
    }

    return this.prisma.$transaction(
      inputs.map((input) =>
        this.prisma.galleryItem.create({
          data: this.buildCreateData(input),
        }),
      ),
    );
  }

  async findAll(query: QueryGalleryDto, isPublic = false) {
    const {
      page = 1,
      limit = 24,
      isPublished,
      search,
      sort = 'manual',
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (isPublic) {
      where.isPublished = true;
    } else if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { altText: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.galleryItem.count({ where }),
      this.prisma.galleryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: resolveGalleryOrderBy(sort),
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

  async findOne(id: number, isPublic = false) {
    const item = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Gallery item not found');
    if (isPublic && !item.isPublished) {
      throw new NotFoundException('Gallery item not found');
    }
    return item;
  }

  async update(id: number, dto: UpdateGalleryItemDto) {
    await this.findOne(id);
    const { takenAt, ...rest } = dto;
    const data = {
      ...rest,
      ...(takenAt !== undefined
        ? { takenAt: takenAt ? new Date(takenAt) : null }
        : {}),
    };

    return this.prisma.galleryItem.update({ where: { id }, data });
  }

  async togglePublish(id: number) {
    const item = await this.findOne(id);
    return this.prisma.galleryItem.update({
      where: { id },
      data: { isPublished: !item.isPublished },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.galleryItem.delete({ where: { id } });
    return { message: 'Gallery item deleted' };
  }
}
