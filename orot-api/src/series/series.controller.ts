import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AssignPostsDto } from './dto/assign-posts.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  createImageUploadOptions,
  removeManagedUpload,
  replaceManagedUpload,
  safeRemoveUploadedAsset,
  toUploadsPublicUrl,
} from '../common/uploads';

const seriesCoverMulterOptions = createImageUploadOptions({
  directory: ['series'],
  maxFileSizeBytes: 10 * 1024 * 1024,
});

// ─── Public Routes ───────────────────────────────────────────────────────────

@ApiTags('Public / Series')
@Controller('public/series')
export class PublicSeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all series' })
  findAll() {
    return this.seriesService.findAllPublic();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get series by slug with published posts' })
  findOne(@Param('slug') slug: string) {
    return this.seriesService.findOnePublic(slug);
  }
}

// ─── Studio Routes ───────────────────────────────────────────────────────────

@ApiTags('Studio / Series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('studio/series')
export class StudioSeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create series' })
  create(@Body() dto: CreateSeriesDto) {
    return this.seriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all series' })
  findAll() {
    return this.seriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get series by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update series' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSeriesDto) {
    return this.seriesService.update(id, dto);
  }

  @Post(':id/cover-image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload series cover image' })
  @UseInterceptors(FileInterceptor('image', seriesCoverMulterOptions))
  async uploadCoverImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const currentSeries = await this.seriesService.findOne(id);
    const nextCoverImage = toUploadsPublicUrl('series', file.filename);

    return replaceManagedUpload({
      tempFilePath: file.path,
      nextPublicPath: nextCoverImage,
      currentPublicPath: currentSeries.coverImage,
      expectedCurrentPrefix: '/uploads/series/',
      update: (coverImage) => this.seriesService.update(id, { coverImage }),
    });
  }

  @Delete(':id/cover-image')
  @ApiOperation({ summary: 'Remove series cover image' })
  async removeCoverImage(@Param('id', ParseIntPipe) id: number) {
    const currentSeries = await this.seriesService.findOne(id);

    return removeManagedUpload({
      currentPublicPath: currentSeries.coverImage,
      expectedCurrentPrefix: '/uploads/series/',
      update: () => this.seriesService.update(id, { coverImage: null }),
    });
  }

  @Patch(':id/posts')
  @ApiOperation({ summary: 'Assign posts to series (ordered)' })
  assignPosts(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPostsDto,
  ) {
    return this.seriesService.assignPosts(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete series' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const currentSeries = await this.seriesService.findOne(id);
    const removed = await this.seriesService.remove(id);

    safeRemoveUploadedAsset(currentSeries.coverImage, '/uploads/series/');

    return removed;
  }
}
