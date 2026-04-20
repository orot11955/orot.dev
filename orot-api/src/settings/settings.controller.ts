import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { mkdirSync, unlinkSync } from 'fs';
import { diskStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { extname, join } from 'path';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { SettingsService, SETTING_KEYS } from './settings.service';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MANAGED_ASSET_KEYS: ReadonlySet<string> = new Set([
  SETTING_KEYS.ABOUT_NAMETAG_IMAGE,
]);

const settingsAssetMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = join(process.cwd(), 'uploads', 'settings');
      mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req: Request, file, cb) => {
      const key = String(req.params.key ?? 'asset').replace(
        /[^a-z0-9_-]/gi,
        '-',
      );
      const unique = `${key}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
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
  limits: { fileSize: 10 * 1024 * 1024 },
};

// ─── Public ──────────────────────────────────────────────────────────────────

@ApiTags('Public / Settings')
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get()
  @ApiOperation({ summary: 'Get public site settings (non-sensitive)' })
  async findAll() {
    const all = await this.settingsService.findAll();
    // Only expose safe keys to public
    return {
      site_name: all['site_name'],
      site_description: all['site_description'],
      site_og_image: all['site_og_image'],
      site_logo: all['site_logo'],
      home_hero_image: all['home_hero_image'],
      home_hero_image_position_y: all['home_hero_image_position_y'],
      about_content: all['about_content'],
      about_stack: all['about_stack'],
      about_resume: all['about_resume'],
      about_links: all['about_links'],
      about_nametag_image: all['about_nametag_image'],
      public_menu: all['public_menu'],
      default_theme: all['default_theme'],
      allow_theme_switch: all['allow_theme_switch'],
      social_links: all['social_links'],
      seo_robots: all['seo_robots'],
      enable_sitemap: all['enable_sitemap'],
      enable_rss: all['enable_rss'],
    };
  }
}

// ─── Studio ───────────────────────────────────────────────────────────────────

@ApiTags('Studio / Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('studio/settings')
export class StudioSettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Patch()
  @ApiOperation({ summary: 'Upsert multiple settings' })
  upsertMany(@Body() dto: UpsertSettingsDto) {
    return this.settingsService.upsertMany(dto);
  }

  @Post('media/:key')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload managed settings media' })
  @UseInterceptors(FileInterceptor('image', settingsAssetMulterOptions))
  async uploadMedia(
    @Param('key') key: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!MANAGED_ASSET_KEYS.has(key)) {
      try {
        unlinkSync(file.path);
      } catch {
        // noop
      }
      throw new BadRequestException('Unsupported settings media key');
    }

    const previous = await this.settingsService.findOne(key);

    if (previous?.startsWith('/uploads/settings/')) {
      try {
        unlinkSync(join(process.cwd(), previous.replace(/^\//, '')));
      } catch {
        // noop
      }
    }

    return this.settingsService.upsertOne(
      key,
      `/uploads/settings/${file.filename}`,
    );
  }
}
