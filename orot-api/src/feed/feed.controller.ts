import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { PostStatus } from '@prisma/client';

const escapeXml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

@ApiTags('Feed')
@Controller()
export class FeedController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('rss.xml')
  @ApiOperation({ summary: 'RSS 2.0 feed' })
  async getRss(@Res() res: Response) {
    const settings = await this.settingsService.findAll();
    const siteUrl = process.env.SITE_URL ?? 'https://orot.dev';
    const siteName = settings['site_name'] ?? 'OROT.DEV';
    const siteDesc = settings['site_description'] ?? '';

    const posts = await this.prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        tags: true,
      },
    });

    const items = posts
      .map((p) => {
        const url = `${siteUrl}/posts/${p.slug}`;
        const pubDate = p.publishedAt
          ? new Date(p.publishedAt).toUTCString()
          : new Date().toUTCString();
        const description = p.excerpt ?? p.content.slice(0, 200);
        const categories = p.tags
          ? p.tags
              .split(',')
              .map((t) => `<category>${escapeXml(t.trim())}</category>`)
              .join('')
          : '';
        return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      ${categories}
    </item>`;
      })
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDesc)}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }

  @Get('sitemap.xml')
  @ApiOperation({ summary: 'XML sitemap' })
  async getSitemap(@Res() res: Response) {
    const siteUrl = process.env.SITE_URL ?? 'https://orot.dev';

    const [posts, series] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: PostStatus.PUBLISHED },
        orderBy: { publishedAt: 'desc' },
        select: { slug: true, publishedAt: true, updatedAt: true },
      }),
      this.prisma.series.findMany({
        where: {
          posts: {
            some: { status: PostStatus.PUBLISHED },
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const staticPages = [
      { url: siteUrl, priority: '1.0', changefreq: 'daily' },
      { url: `${siteUrl}/posts`, priority: '0.9', changefreq: 'daily' },
      { url: `${siteUrl}/photos`, priority: '0.8', changefreq: 'weekly' },
      { url: `${siteUrl}/about`, priority: '0.7', changefreq: 'monthly' },
    ];

    const staticUrls = staticPages
      .map(
        (p) => `
  <url>
    <loc>${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
      )
      .join('');

    const postUrls = posts
      .map((p) => {
        const lastmod = new Date(p.updatedAt ?? p.publishedAt ?? new Date())
          .toISOString()
          .slice(0, 10);
        return `
  <url>
    <loc>${siteUrl}/posts/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      })
      .join('');

    const seriesUrls = series
      .map((item) => {
        const lastmod = new Date(item.updatedAt).toISOString().slice(0, 10);
        return `
  <url>
    <loc>${siteUrl}/series/${item.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
      })
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${postUrls}
  ${seriesUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }
}
