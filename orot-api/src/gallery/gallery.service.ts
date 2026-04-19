import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { UpdateGalleryItemDto } from './dto/update-gallery-item.dto';
import { QueryGalleryDto } from './dto/query-gallery.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateGalleryItemDto,
    imageUrl: string,
    thumbnailUrl?: string,
    width?: number,
    height?: number,
  ) {
    return this.prisma.galleryItem.create({
      data: {
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
      },
    });
  }

  async findAll(query: QueryGalleryDto, isPublic = false) {
    const { page = 1, limit = 24, isPublished, search } = query;
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
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
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
      ...(takenAt ? { takenAt: new Date(takenAt) } : {}),
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
