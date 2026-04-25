import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  createImageUploadOptions,
  removeManagedUpload,
  replaceManagedUpload,
  safeRemoveFile,
  safeRemoveUploadedAsset,
  toUploadsPublicUrl,
} from '../common/uploads';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { TransitionPostDto } from './dto/transition-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

const VIEWED_POSTS_COOKIE = 'viewed_posts';
const VIEWED_POSTS_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_VIEWED_POST_IDS = 100;

function normalizeSlugParam(slug: string): string {
  const trimmed = slug.trim();

  if (!trimmed) {
    return '';
  }

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

const postCoverMulterOptions = createImageUploadOptions({
  directory: ['posts'],
  maxFileSizeBytes: 50 * 1024 * 1024,
});

const postContentImageMulterOptions = createImageUploadOptions({
  directory: ['posts', 'content'],
  maxFileSizeBytes: 50 * 1024 * 1024,
  filenamePrefix: (req) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    return `post-${id ?? 'unknown'}`;
  },
});

@ApiTags('Public / Posts')
@Controller('public/posts')
export class PublicPostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly configService: ConfigService,
  ) { }

  @Get('tags')
  @ApiOperation({ summary: 'Get all published post tags' })
  getAllTags() {
    return this.postsService.getAllTags();
  }

  @Get()
  @ApiOperation({ summary: 'List published posts' })
  findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query, 'public');
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published post by slug' })
  findOne(@Param('slug') slug: string) {
    return this.postsService.findOneForArea(normalizeSlugParam(slug), 'public');
  }

  @Post(':slug/view')
  @ApiOperation({ summary: 'Record a published post view' })
  async recordView(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const viewedPostIds = this.parseViewedPostIds(
      req.cookies?.[VIEWED_POSTS_COOKIE] as string | undefined,
    );
    const result = await this.postsService.recordPublicView(
      normalizeSlugParam(slug),
      viewedPostIds,
    );

    if (result.counted) {
      viewedPostIds.add(result.postId);
      this.setViewedPostsCookie(res, viewedPostIds);
    }

    return {
      viewCount: result.viewCount,
      counted: result.counted,
    };
  }

  private parseViewedPostIds(rawCookie?: string): Set<number> {
    if (!rawCookie) {
      return new Set<number>();
    }

    return new Set(
      rawCookie
        .split('.')
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0),
    );
  }

  private setViewedPostsCookie(res: Response, viewedPostIds: Iterable<number>) {
    const secure = this.configService.get<boolean>('cookie.secure');
    const domain = this.configService.get<string>('cookie.domain');
    const value = Array.from(new Set(viewedPostIds))
      .slice(-MAX_VIEWED_POST_IDS)
      .join('.');

    res.cookie(VIEWED_POSTS_COOKIE, value, {
      httpOnly: true,
      secure: secure ?? false,
      sameSite: 'lax',
      path: '/',
      maxAge: VIEWED_POSTS_COOKIE_MAX_AGE,
      ...(domain ? { domain } : {}),
    });
  }
}

@ApiTags('Editor / Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('editor/posts')
export class EditorPostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @ApiOperation({ summary: 'Create editor draft' })
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List editor-visible posts' })
  findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query, 'editor');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get editor-visible post by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOneForArea(id, 'editor');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update editor-visible post' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto, 'editor');
  }

  @Patch(':id/transition')
  @ApiOperation({ summary: 'Transition editor-visible post status' })
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionPostDto,
  ) {
    return this.postsService.transition(id, dto, 'editor');
  }

  @Post(':id/cover-image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload editor post cover image' })
  @UseInterceptors(FileInterceptor('image', postCoverMulterOptions))
  async uploadCoverImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const currentPost = await this.postsService.findOneForArea(id, 'editor');
    const nextCoverImage = toUploadsPublicUrl('posts', file.filename);

    return replaceManagedUpload({
      tempFilePath: file.path,
      nextPublicPath: nextCoverImage,
      currentPublicPath: currentPost.coverImage,
      expectedCurrentPrefix: '/uploads/posts/',
      update: (coverImage) =>
        this.postsService.update(id, { coverImage }, 'editor'),
    });
  }

  @Post(':id/content-image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload editor post content image' })
  @UseInterceptors(FileInterceptor('image', postContentImageMulterOptions))
  async uploadContentImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    try {
      await this.postsService.findOneForArea(id, 'editor');
      return { url: toUploadsPublicUrl('posts', 'content', file.filename) };
    } catch (error) {
      safeRemoveFile(file.path);
      throw error;
    }
  }

  @Delete(':id/cover-image')
  @ApiOperation({ summary: 'Remove editor post cover image' })
  async removeCoverImage(@Param('id', ParseIntPipe) id: number) {
    const currentPost = await this.postsService.findOneForArea(id, 'editor');

    return removeManagedUpload({
      currentPublicPath: currentPost.coverImage,
      expectedCurrentPrefix: '/uploads/posts/',
      update: () =>
        this.postsService.update(id, { coverImage: null }, 'editor'),
    });
  }
}

@ApiTags('Studio / Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('studio/posts')
export class StudioPostsController {
  constructor(private readonly postsService: PostsService) { }

  @Get()
  @ApiOperation({ summary: 'List studio-visible posts' })
  findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query, 'studio');
  }

  @Get('slug/:slug')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({
    summary: 'Get studio-visible post by slug for staff preview',
  })
  findBySlug(@Param('slug') slug: string) {
    return this.postsService.findOneForArea(normalizeSlugParam(slug), 'studio');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get studio-visible post by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOneForArea(id, 'studio');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update studio-visible post' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto, 'studio');
  }

  @Patch(':id/transition')
  @ApiOperation({ summary: 'Transition studio-visible post status' })
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionPostDto,
  ) {
    return this.postsService.transition(id, dto, 'studio');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete post' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const currentPost = await this.postsService.findOneForArea(id, 'studio');
    const removed = await this.postsService.remove(id);

    safeRemoveUploadedAsset(currentPost.coverImage, '/uploads/posts/');

    return removed;
  }
}
