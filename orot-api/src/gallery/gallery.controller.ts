import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { UpdateGalleryItemDto } from './dto/update-gallery-item.dto';
import { QueryGalleryDto } from './dto/query-gallery.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  createImageUploadOptions,
  resolveUploadsDiskPath,
  safeRemoveFile,
  safeRemoveUploadedAsset,
  toUploadsPublicUrl,
} from '../common/uploads';
import { createGalleryThumbnail } from './image-processing';
import { parse } from 'path';

const multerOptions = createImageUploadOptions({
  directory: ['gallery'],
  maxFileSizeBytes: 20 * 1024 * 1024,
});

const MAX_GALLERY_UPLOAD_FILES = 20;

interface PreparedGalleryUpload {
  dto: CreateGalleryItemDto;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  tempFilePath: string;
}

// ─── Public Routes ───────────────────────────────────────────────────────────

@ApiTags('Public / Gallery')
@Controller('public/gallery')
export class PublicGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @ApiOperation({ summary: 'List published gallery items' })
  findAll(@Query() query: QueryGalleryDto) {
    return this.galleryService.findAll(query, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get gallery item by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.findOne(id, true);
  }
}

// ─── Studio Routes ───────────────────────────────────────────────────────────

@ApiTags('Studio / Gallery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('studio/gallery')
export class StudioGalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  private resolveFallbackTitle(file: Express.Multer.File) {
    const fallback = parse(file.originalname).name.trim();
    return fallback || undefined;
  }

  private cleanupPreparedUpload(upload: PreparedGalleryUpload) {
    safeRemoveFile(upload.tempFilePath);
    safeRemoveUploadedAsset(upload.thumbnailUrl, '/uploads/gallery/thumbs/');
  }

  private async prepareUpload(
    file: Express.Multer.File,
    dto: CreateGalleryItemDto,
    options?: {
      fallbackTitle?: string;
      sortOrderOffset?: number;
    },
  ): Promise<PreparedGalleryUpload> {
    const imageUrl = toUploadsPublicUrl('gallery', file.filename);
    const filePath = resolveUploadsDiskPath('gallery', file.filename);
    const fallbackThumbnailUrl = toUploadsPublicUrl(
      'gallery',
      'thumbs',
      `${parse(file.filename).name}.webp`,
    );

    try {
      const thumbnail = await createGalleryThumbnail(filePath, file.filename);
      const title = dto.title?.trim() || options?.fallbackTitle;
      const takenAt = dto.takenAt?.trim() || thumbnail.takenAt?.toISOString();
      const baseSortOrder = dto.sortOrder ?? 0;

      return {
        dto: {
          ...dto,
          title,
          takenAt,
          sortOrder: baseSortOrder + (options?.sortOrderOffset ?? 0),
        },
        imageUrl,
        thumbnailUrl: thumbnail.thumbnailUrl,
        width: thumbnail.width,
        height: thumbnail.height,
        tempFilePath: file.path,
      };
    } catch (error) {
      safeRemoveFile(file.path);
      safeRemoveUploadedAsset(fallbackThumbnailUrl, '/uploads/gallery/thumbs/');
      throw error;
    }
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload gallery image' })
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateGalleryItemDto,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const prepared = await this.prepareUpload(file, dto);

    try {
      return await this.galleryService.create(
        prepared.dto,
        prepared.imageUrl,
        prepared.thumbnailUrl,
        prepared.width,
        prepared.height,
      );
    } catch (error) {
      this.cleanupPreparedUpload(prepared);
      throw error;
    }
  }

  @Post('batch')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple gallery images' })
  @UseInterceptors(
    FilesInterceptor('image', MAX_GALLERY_UPLOAD_FILES, multerOptions),
  )
  async createMany(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateGalleryItemDto,
  ) {
    if (!files?.length) {
      throw new BadRequestException('Image file is required');
    }

    const preparedUploads: PreparedGalleryUpload[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];

      try {
        preparedUploads.push(
          await this.prepareUpload(file, dto, {
            fallbackTitle: this.resolveFallbackTitle(file),
            sortOrderOffset: index,
          }),
        );
      } catch (error) {
        preparedUploads.forEach((upload) => this.cleanupPreparedUpload(upload));

        for (const pendingFile of files.slice(index + 1)) {
          safeRemoveFile(pendingFile.path);
        }

        throw error;
      }
    }

    try {
      return await this.galleryService.createMany(
        preparedUploads.map((upload) => ({
          dto: upload.dto,
          imageUrl: upload.imageUrl,
          thumbnailUrl: upload.thumbnailUrl,
          width: upload.width,
          height: upload.height,
        })),
      );
    } catch (error) {
      preparedUploads.forEach((upload) => this.cleanupPreparedUpload(upload));
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all gallery items' })
  findAll(@Query() query: QueryGalleryDto) {
    return this.galleryService.findAll(query, false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get gallery item by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update gallery item metadata' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGalleryItemDto,
  ) {
    return this.galleryService.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Toggle publish status' })
  togglePublish(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.togglePublish(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete gallery item' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const item = await this.galleryService.findOne(id);
    const removed = await this.galleryService.remove(id);

    safeRemoveUploadedAsset(item.imageUrl, '/uploads/gallery/');
    safeRemoveUploadedAsset(item.thumbnailUrl, '/uploads/gallery/thumbs/');

    return removed;
  }
}
