import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SETTINGS, type SettingKey } from './settings.constants';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    // Merge with defaults (return defaults for missing keys)
    return { ...DEFAULT_SETTINGS, ...map };
  }

  async findOne(key: string): Promise<string | null> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? DEFAULT_SETTINGS[key as SettingKey] ?? null;
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
    return this.findAll();
  }

  async upsertOne(key: string, value: string) {
    await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    return this.findAll();
  }
}
