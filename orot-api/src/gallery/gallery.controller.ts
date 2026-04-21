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
import type { Request } from 'express';
import { diskStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { extname, join } from 'path';
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
import { createGalleryThumbnail } from './image-processing';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const multerOptions = {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'gallery'),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
};

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
    const imageUrl = `/uploads/gallery/${file.filename}`;
    const filePath = join(process.cwd(), 'uploads', 'gallery', file.filename);
    const thumbnail = await createGalleryThumbnail(filePath, file.filename);
    const takenAt = dto.takenAt?.trim() || thumbnail.takenAt?.toISOString();

    return this.galleryService.create(
      {
        ...dto,
        takenAt,
      },
      imageUrl,
      thumbnail.thumbnailUrl,
      thumbnail.width,
      thumbnail.height,
    );
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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.remove(id);
  }
}
