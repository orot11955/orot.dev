import type { PublicMenuItem, PublicSettings, SocialLinkItem } from '@/types';
import { isObjectRecord, safeParseJsonArray } from '@/utils/json';

export const DEFAULT_PUBLIC_NAV: PublicMenuItem[] = [
  { key: 'home', label: 'Home', href: '/', enabled: true },
  { key: 'posts', label: 'Posts', href: '/posts', enabled: true },
  { key: 'photos', label: 'Photos', href: '/photos', enabled: true },
  { key: 'about', label: 'About', href: '/about', enabled: true },
];

function isPublicMenuItem(value: unknown): value is PublicMenuItem {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.key === 'string' &&
    typeof value.label === 'string' &&
    typeof value.href === 'string'
  );
}

function isSocialLink(value: unknown): value is SocialLinkItem {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.label === 'string' &&
    typeof value.url === 'string'
  );
}

export function parsePublicMenu(raw?: string | null): PublicMenuItem[] {
  return safeParseJsonArray(raw, DEFAULT_PUBLIC_NAV, isPublicMenuItem);
}

export function parseSocialLinks(
  raw?: string | null,
): SocialLinkItem[] {
  return safeParseJsonArray(raw, [], isSocialLink);
}

export function parseDelimitedLinks(raw?: string | null): SocialLinkItem[] {
  if (!raw) {
    return [];
  }

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split('|').map((value) => value?.trim() ?? '');
      return label && url ? { label, url } : null;
    })
    .filter((item): item is SocialLinkItem => item !== null);
}

export function parseGlobalLinks(
  settings?: Pick<PublicSettings, 'social_links' | 'about_links'> | null,
): SocialLinkItem[] {
  const links = [
    ...parseSocialLinks(settings?.social_links),
    ...parseDelimitedLinks(settings?.about_links),
  ];
  const seen = new Set<string>();

  return links.filter((link) => {
    const key = `${link.label.trim().toLowerCase()}|${link.url.trim()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return Boolean(link.label.trim() && link.url.trim());
  });
}
