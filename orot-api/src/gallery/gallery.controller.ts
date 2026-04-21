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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

const multerOptions = createImageUploadOptions({
  directory: ['gallery'],
  maxFileSizeBytes: 20 * 1024 * 1024,
});

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

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload gallery image' })
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateGalleryItemDto,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const imageUrl = toUploadsPublicUrl('gallery', file.filename);
    const filePath = resolveUploadsDiskPath('gallery', file.filename);
    const thumbnail = await createGalleryThumbnail(filePath, file.filename);
    const takenAt = dto.takenAt?.trim() || thumbnail.takenAt?.toISOString();

    try {
      return await this.galleryService.create(
        {
          ...dto,
          takenAt,
        },
        imageUrl,
        thumbnail.thumbnailUrl,
        thumbnail.width,
        thumbnail.height,
      );
    } catch (error) {
      safeRemoveFile(file.path);
      safeRemoveUploadedAsset(
        thumbnail.thumbnailUrl,
        '/uploads/gallery/thumbs/',
      );
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
