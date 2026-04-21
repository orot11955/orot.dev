import type { PublicMenuItem } from '@/types';
import { isObjectRecord, safeParseJsonArray } from '@/utils/json';

export const DEFAULT_PUBLIC_NAV: PublicMenuItem[] = [
  { key: 'home', label: 'Home', href: '/', enabled: true },
  { key: 'posts', label: 'Posts', href: '/posts', enabled: true },
  { key: 'photos', label: 'Photos', href: '/photos', enabled: true },
  { key: 'about', label: 'About', href: '/about', enabled: true },
];

export const ASSET_TOKENS = {
  light: {
    logo: '/full_orot_black.png',
  },
  dark: {
    logo: '/full_orot_white.png',
  },
} as const;

export type AssetTheme = keyof typeof ASSET_TOKENS;

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

function isSocialLink(
  value: unknown,
): value is { label: string; url: string; icon?: string } {
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
): Array<{ label: string; url: string; icon?: string }> {
  return safeParseJsonArray(raw, [], isSocialLink);
}
