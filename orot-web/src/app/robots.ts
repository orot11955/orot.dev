import type { MetadataRoute } from 'next';
import { resolveSiteUrl } from '@/utils/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/editor', '/studio'],
    },
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  };
}
