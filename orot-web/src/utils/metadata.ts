import type { Metadata } from 'next';
import type { PublicSettings } from '@/types';
import { resolveAssetUrl } from './content';

const DEFAULT_SITE_NAME = 'orot.dev';
const DEFAULT_SITE_DESCRIPTION = '개발, 사진, 그리고 기록';
const DEFAULT_OG_IMAGE = '/full_orot_black.png';

interface PublicMetadataOptions {
  title?: string;
  absoluteTitle?: string;
  description?: string;
  path?: string;
  settings?: PublicSettings | null;
  keywords?: string[];
  image?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  robots?: Metadata['robots'];
}

interface RestrictedMetadataOptions {
  section: string;
  title?: string;
  description?: string;
}

function normalizeText(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeList(values?: string[]): string[] | undefined {
  const normalized = values
    ?.map((value) => value.trim())
    .filter(Boolean);

  return normalized && normalized.length > 0 ? normalized : undefined;
}

function createRobotsDirectives(index: boolean, follow: boolean): Metadata['robots'] {
  return {
    index,
    follow,
    googleBot: {
      index,
      follow,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

function resolveRobots(settings?: PublicSettings | null): Metadata['robots'] | undefined {
  const raw = normalizeText(settings?.seo_robots)?.toLowerCase();
  if (!raw) {
    return undefined;
  }

  const directives = new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const index = !directives.has('noindex');
  const follow = !directives.has('nofollow');

  return createRobotsDirectives(index, follow);
}

function resolveMetadataImage(
  settings?: PublicSettings | null,
  image?: string | null,
): string | undefined {
  const candidate = normalizeText(image);
  if (candidate) {
    return resolveAssetUrl(candidate) || candidate;
  }

  const configured = normalizeText(settings?.site_og_image);
  if (configured) {
    return resolveAssetUrl(configured) || configured;
  }

  return DEFAULT_OG_IMAGE;
}

function resolveMetadataLogo(settings?: PublicSettings | null): string | undefined {
  const logo =
    normalizeText(settings?.site_logo_light) ??
    normalizeText(settings?.site_logo_dark) ??
    normalizeText(settings?.site_logo);

  if (logo) {
    return resolveAssetUrl(logo) || logo;
  }

  return undefined;
}

export function resolveSiteName(settings?: PublicSettings | null): string {
  return normalizeText(settings?.site_name) ?? DEFAULT_SITE_NAME;
}

export function resolveSiteDescription(settings?: PublicSettings | null): string {
  return normalizeText(settings?.site_description) ?? DEFAULT_SITE_DESCRIPTION;
}

export function resolveSiteImage(
  settings?: PublicSettings | null,
  image?: string | null,
): string | undefined {
  return resolveMetadataImage(settings, image);
}

export function resolveSiteLogo(settings?: PublicSettings | null): string | undefined {
  return resolveMetadataLogo(settings);
}

export function resolveSiteIcon(settings?: PublicSettings | null): string | undefined {
  return resolveMetadataLogo(settings) ?? resolveMetadataImage(settings);
}

export function createNoIndexRobots(follow = true): Metadata['robots'] {
  return createRobotsDirectives(false, follow);
}

export function createPublicMetadata({
  title,
  absoluteTitle,
  description,
  path,
  settings,
  keywords,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags,
  robots,
}: PublicMetadataOptions): Metadata {
  const siteName = resolveSiteName(settings);
  const pageTitle = normalizeText(title);
  const explicitTitle = normalizeText(absoluteTitle);
  const pageDescription = normalizeText(description) ?? resolveSiteDescription(settings);
  const imageUrl = resolveMetadataImage(settings, image);
  const metadataTitle =
    explicitTitle ?? (pageTitle ? `${pageTitle} | ${siteName}` : siteName);
  const socialTitle = explicitTitle ?? pageTitle ?? siteName;
  const normalizedKeywords = normalizeList(keywords);
  const normalizedTags = normalizeList(tags);

  const baseMetadata: Metadata = {
    title: metadataTitle,
    description: pageDescription,
    keywords: normalizedKeywords,
    alternates: path ? { canonical: path } : undefined,
    robots: robots ?? resolveRobots(settings),
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: socialTitle,
      description: pageDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };

  if (type === 'article') {
    return {
      ...baseMetadata,
      openGraph: {
        type: 'article',
        siteName,
        title: socialTitle,
        description: pageDescription,
        url: path,
        publishedTime,
        modifiedTime,
        tags: normalizedTags,
        images: imageUrl ? [{ url: imageUrl, alt: socialTitle }] : undefined,
      },
    };
  }

  return {
    ...baseMetadata,
    openGraph: {
      type: 'website',
      siteName,
      title: socialTitle,
      description: pageDescription,
      url: path,
      images: imageUrl ? [{ url: imageUrl, alt: socialTitle }] : undefined,
    },
  };
}

export function createPublicNotFoundMetadata({
  title = '페이지를 찾을 수 없음',
  description = '요청한 페이지를 찾을 수 없습니다.',
  settings,
}: {
  title?: string;
  description?: string;
  settings?: PublicSettings | null;
}): Metadata {
  return createPublicMetadata({
    title,
    description,
    settings,
    robots: createNoIndexRobots(),
  });
}

export function createRestrictedMetadata({
  section,
  title,
  description,
}: RestrictedMetadataOptions): Metadata {
  const pageTitle = normalizeText(title);
  const suffix = `${section} | orot.dev`;

  return {
    title: pageTitle ? `${pageTitle} | ${suffix}` : suffix,
    description: normalizeText(description),
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}
