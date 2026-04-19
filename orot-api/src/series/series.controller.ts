import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AssignPostsDto } from './dto/assign-posts.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seriesService.remove(id);
  }
}
