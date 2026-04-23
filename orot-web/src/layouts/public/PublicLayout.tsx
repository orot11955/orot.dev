import type { ReactNode } from 'react';
import { getPublicSettings } from '@/utils/public-settings';
import { PublicBackTopButton } from './PublicBackTopButton';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { PublicPageVisit } from './PublicPageVisit';
import {
  DEFAULT_PUBLIC_NAV,
  parseGlobalLinks,
  parsePublicMenu,
} from './public-navigation';
import { resolveAssetUrl } from '@/utils/content';
import {
  resolveSiteDescription,
  resolveSiteImage,
  resolveSiteLogo,
} from '@/utils/metadata';
import styles from './PublicLayout.module.css';
import { PublicStructuredData } from './PublicStructuredData';

function toBool(value?: string | null): boolean {
  return value === 'true';
}

export async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicSettings();

  const menu = settings?.public_menu
    ? parsePublicMenu(settings.public_menu)
    : DEFAULT_PUBLIC_NAV;
  const navItems = menu.filter((item) => item.enabled !== false);
  const social = parseGlobalLinks(settings);
  const siteName = settings?.site_name?.trim() || 'orot.dev';
  const siteDescription = resolveSiteDescription(settings);
  const siteLogoLight = resolveAssetUrl(
    settings?.site_logo_light || settings?.site_logo,
  );
  const siteLogoDark = resolveAssetUrl(
    settings?.site_logo_dark || settings?.site_logo,
  );
  const structuredLogo = resolveSiteLogo(settings);
  const structuredImage = resolveSiteImage(settings);
  const allowThemeSwitch = toBool(settings?.allow_theme_switch ?? 'true');

  return (
    <div className={styles.shell}>
      <PublicStructuredData
        siteName={siteName}
        description={siteDescription}
        logoUrl={structuredLogo}
        imageUrl={structuredImage}
        sameAs={social.map((item) => item.url)}
      />
      <PublicPageVisit />
      <PublicHeader
        siteName={siteName}
        siteLogoLight={siteLogoLight}
        siteLogoDark={siteLogoDark}
        nav={navItems}
        allowThemeSwitch={allowThemeSwitch}
      />
      <main className={styles.main}>{children}</main>
      <PublicFooter
        siteName={siteName}
        description={siteDescription}
        nav={navItems}
        social={social}
      />
      <PublicBackTopButton />
    </div>
  );
}
