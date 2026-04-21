import { serverGet } from '@/utils/server-api';
import { AboutPage } from '@/components/public/about/AboutPage';
import type { PublicSettings } from '@/types';

export default async function AboutRoute() {
  const settings = await serverGet<PublicSettings>('/public/settings', undefined, {
    cache: 'no-store',
    revalidate: false,
  });

  return <AboutPage settings={settings} />;
}
