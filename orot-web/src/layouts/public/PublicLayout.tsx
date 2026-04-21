import type { ReactNode } from 'react';
import { getPublicSettings } from '@/utils/public-settings';
import { PublicBackTopButton } from './PublicBackTopButton';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { PublicPageVisit } from './PublicPageVisit';
import {
  DEFAULT_PUBLIC_NAV,
  parsePublicMenu,
  parseSocialLinks,
} from './public-navigation';
import styles from './PublicLayout.module.css';

export async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicSettings();

  const menu = parsePublicMenu(settings?.public_menu).filter(
    (item) => item.enabled !== false,
  );
  const social = parseSocialLinks(settings?.social_links);
  const siteName = settings?.site_name?.trim() || 'orot.dev';
  const navItems = menu.length > 0 ? menu : DEFAULT_PUBLIC_NAV;

  return (
    <div className={styles.shell}>
      <PublicPageVisit />
      <PublicHeader siteName={siteName} nav={navItems} />
      <main className={styles.main}>{children}</main>
      <PublicFooter
        siteName={siteName}
        description={settings?.site_description}
        social={social}
      />
      <PublicBackTopButton />
    </div>
  );
}
