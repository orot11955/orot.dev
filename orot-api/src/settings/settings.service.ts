import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';

// Well-known setting keys
export const SETTING_KEYS = {
  SITE_NAME: 'site_name',
  SITE_DESCRIPTION: 'site_description',
  SITE_OG_IMAGE: 'site_og_image',
  SITE_LOGO: 'site_logo',
  HOME_HERO_IMAGE: 'home_hero_image',
  ABOUT_CONTENT: 'about_content',
  ABOUT_STACK: 'about_stack',
  ABOUT_RESUME: 'about_resume',
  ABOUT_LINKS: 'about_links',
  ABOUT_NAMETAG_IMAGE: 'about_nametag_image',
  FILTER_KEYWORDS: 'filter_keywords',
  PUBLIC_MENU: 'public_menu',
  DEFAULT_THEME: 'default_theme',
  ALLOW_THEME_SWITCH: 'allow_theme_switch',
  SOCIAL_LINKS: 'social_links',
  SEO_ROBOTS: 'seo_robots',
  ENABLE_SITEMAP: 'enable_sitemap',
  ENABLE_RSS: 'enable_rss',
} as const;

const DEFAULT_PUBLIC_MENU = JSON.stringify([
  { key: 'home', label: 'Home', href: '/', enabled: true },
  { key: 'posts', label: '글', href: '/posts', enabled: true },
  { key: 'photos', label: '사진', href: '/photos', enabled: true },
  { key: 'about', label: 'About', href: '/about', enabled: true },
]);

const DEFAULT_SOCIAL_LINKS = JSON.stringify([]);

const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTING_KEYS.SITE_NAME]: 'OROT.DEV',
  [SETTING_KEYS.SITE_DESCRIPTION]: '개인 블로그 및 사진 갤러리',
  [SETTING_KEYS.SITE_OG_IMAGE]: '',
  [SETTING_KEYS.SITE_LOGO]: '',
  [SETTING_KEYS.HOME_HERO_IMAGE]: '',
  [SETTING_KEYS.ABOUT_CONTENT]: '안녕하세요. OROT.DEV입니다.',
  [SETTING_KEYS.ABOUT_STACK]: '',
  [SETTING_KEYS.ABOUT_RESUME]: '',
  [SETTING_KEYS.ABOUT_LINKS]: '',
  [SETTING_KEYS.ABOUT_NAMETAG_IMAGE]: '',
  [SETTING_KEYS.FILTER_KEYWORDS]: '스팸,spam,광고,advertisement',
  [SETTING_KEYS.PUBLIC_MENU]: DEFAULT_PUBLIC_MENU,
  [SETTING_KEYS.DEFAULT_THEME]: 'light',
  [SETTING_KEYS.ALLOW_THEME_SWITCH]: 'true',
  [SETTING_KEYS.SOCIAL_LINKS]: DEFAULT_SOCIAL_LINKS,
  [SETTING_KEYS.SEO_ROBOTS]: 'index,follow',
  [SETTING_KEYS.ENABLE_SITEMAP]: 'true',
  [SETTING_KEYS.ENABLE_RSS]: 'true',
};

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
    return row?.value ?? DEFAULT_SETTINGS[key] ?? null;
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
