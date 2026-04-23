import type { MetadataRoute } from 'next';
import { getPublicSettings } from '@/utils/public-settings';
import {
  resolveSiteDescription,
  resolveSiteIcon,
  resolveSiteName,
} from '@/utils/metadata';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPublicSettings();
  const siteName = resolveSiteName(settings);
  const description = resolveSiteDescription(settings);
  const iconUrl = resolveSiteIcon(settings) ?? '/favicon.ico';

  return {
    name: siteName,
    short_name: siteName,
    description,
    start_url: '/',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#111111',
    icons: [
      {
        src: iconUrl,
        sizes: 'any',
      },
    ],
  };
}
