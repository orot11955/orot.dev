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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  createImageUploadOptions,
  replaceManagedUpload,
  safeRemoveFile,
  toUploadsPublicUrl,
} from '../common/uploads';
import {
  MANAGED_SETTINGS_ASSET_KEYS,
  PUBLIC_SETTING_KEYS,
  type SettingKey,
} from './settings.constants';
import { SettingsService } from './settings.service';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const settingsAssetMulterOptions = createImageUploadOptions({
  directory: ['settings'],
  maxFileSizeBytes: 50 * 1024 * 1024,
  filenamePrefix: (req) => String(req.params.key ?? 'asset'),
});

// ─── Public ──────────────────────────────────────────────────────────────────

@ApiTags('Public / Settings')
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get public site settings (non-sensitive)' })
  async findAll() {
    const all = await this.settingsService.findAll();

    return Object.fromEntries(
      PUBLIC_SETTING_KEYS.map((key) => [key, all[key]]),
    );
  }
}

// ─── Studio ───────────────────────────────────────────────────────────────────

@ApiTags('Studio / Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('studio/settings')
export class StudioSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

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

    if (!MANAGED_SETTINGS_ASSET_KEYS.has(key as SettingKey)) {
      safeRemoveFile(file.path);
      throw new BadRequestException('Unsupported settings media key');
    }

    const previous = await this.settingsService.findOne(key);
    const nextPublicPath = toUploadsPublicUrl('settings', file.filename);

    return replaceManagedUpload({
      tempFilePath: file.path,
      nextPublicPath,
      currentPublicPath: previous,
      expectedCurrentPrefix: '/uploads/settings/',
      update: (value) => this.settingsService.upsertOne(key, value),
    });
  }
}
