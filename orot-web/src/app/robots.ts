import type { MetadataRoute } from 'next';
import { getPublicSettings } from '@/utils/public-settings';
import { resolveSiteUrl } from '@/utils/site-url';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSettings();
  const siteUrl = resolveSiteUrl();
  const sitemapEnabled = settings?.enable_sitemap !== 'false';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/editor', '/studio', '/healthz', '/_logs'],
    },
    host: siteUrl.toString(),
    sitemap: sitemapEnabled
      ? new URL('/sitemap.xml', siteUrl).toString()
      : undefined,
  };
}
