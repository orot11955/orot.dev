import type { PublicMenuItem } from '@/types';

export const DEFAULT_PUBLIC_NAV: PublicMenuItem[] = [
  { key: 'home', label: 'Home', href: '/', enabled: true },
  { key: 'posts', label: 'Posts', href: '/posts', enabled: true },
  { key: 'photos', label: 'Photos', href: '/photos', enabled: true },
  { key: 'about', label: 'About', href: '/about', enabled: true },
];

export const ASSET_TOKENS = {
  light: {
    logo: './full_orot_black.png',
  },
  dark: {
    logo: './full_orot_white.png',
  },
} as const;

export type AssetTheme = keyof typeof ASSET_TOKENS;

export function parsePublicMenu(raw?: string | null): PublicMenuItem[] {
  if (!raw) return DEFAULT_PUBLIC_NAV;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_PUBLIC_NAV;
    const items = parsed.filter(
      (item): item is PublicMenuItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as PublicMenuItem).key === 'string' &&
        typeof (item as PublicMenuItem).label === 'string' &&
        typeof (item as PublicMenuItem).href === 'string',
    );
    return items.length > 0 ? items : DEFAULT_PUBLIC_NAV;
  } catch {
    return DEFAULT_PUBLIC_NAV;
  }
}

export function parseSocialLinks(
  raw?: string | null,
): Array<{ label: string; url: string; icon?: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is { label: string; url: string; icon?: string } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { url?: unknown }).url === 'string',
    );
  } catch {
    return [];
  }
}
