import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SETTINGS, type SettingKey } from './settings.constants';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';

const SETTINGS_CACHE_TTL_MS = 60_000;

@Injectable()
export class SettingsService {
  private settingsCache: {
    value: Record<string, string>;
    expiresAt: number;
  } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Record<string, string>> {
    const cached = this.getCachedSettings();
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.siteSetting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    // Merge with defaults (return defaults for missing keys)
    return this.setCachedSettings({ ...DEFAULT_SETTINGS, ...map });
  }

  async findOne(key: string): Promise<string | null> {
    const all = await this.findAll();
    return all[key] ?? DEFAULT_SETTINGS[key as SettingKey] ?? null;
  }

  async upsertMany(dto: UpsertSettingsDto) {
    const ops = dto.settings.map((item) =>
      this.prisma.siteSetting.upsert({
        where: { key: item.key },
        create: { key: item.key, value: item.value },
        update: { value: item.value },
      }),
    );
    await Promise.all(ops);
    this.clearSettingsCache();
    return this.findAll();
  }

  async upsertOne(key: string, value: string) {
    await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    this.clearSettingsCache();
    return this.findAll();
  }

  private getCachedSettings(): Record<string, string> | null {
    if (
      this.settingsCache &&
      this.settingsCache.expiresAt > Date.now()
    ) {
      return this.settingsCache.value;
    }

    this.settingsCache = null;
    return null;
  }

  private setCachedSettings(value: Record<string, string>) {
    this.settingsCache = {
      value,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
    };

    return value;
  }

  private clearSettingsCache() {
    this.settingsCache = null;
  }
}
