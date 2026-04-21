import type { Metadata } from 'next';
import { AboutPage } from '@/components/public/about/AboutPage';
import { createPublicMetadata } from '@/utils/metadata';
import { getPublicSettings } from '@/utils/public-settings';

function summarizeAboutContent(value?: string | null): string | undefined {
  const firstLine = value
    ?.split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine?.slice(0, 140);
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const description =
    summarizeAboutContent(settings?.about_content) ||
    '소개, 이력, 링크를 한곳에 모아둔 페이지';

  return createPublicMetadata({
    title: '소개',
    description,
    path: '/about',
    settings,
    image: settings?.about_nametag_image || settings?.site_og_image,
    keywords: ['소개', '이력', '프로필'],
  });
}

export default async function AboutRoute() {
  const settings = await getPublicSettings();

  return <AboutPage settings={settings} />;
}
