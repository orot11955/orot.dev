'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  Button,
  EditIcon,
  LogOut,
} from 'orot-ui';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { ConsoleLayoutShell } from '../shared/ConsoleLayoutShell';
import { StudioSidebar } from './StudioSidebar';
import { STUDIO_NAV } from './studio-navigation';
import styles from './StudioLayout.module.css';

function getActiveLabel(pathname: string): string {
  const match = STUDIO_NAV.find(({ href, exact }) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`),
  );
  return match?.label ?? 'Studio';
}

export function StudioLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const activeLabel = getActiveLabel(pathname);

  const navigateToEditor = () => {
    window.location.assign('/editor');
  };

  const navigateToSite = () => {
    window.location.assign('/');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/studio/login');
  };

  return (
    <ConsoleLayoutShell
      styles={styles}
      drawerWidth={300}
      renderTitle={(className) => <h1 className={className}>{activeLabel}</h1>}
      renderDesktopSidebar={() => (
        <StudioSidebar
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
        />
      )}
      renderMobileSidebar={(closeMobileSidebar) => (
        <StudioSidebar
          pathname={pathname}
          user={user}
          variant="mobile"
          onNavigate={closeMobileSidebar}
          onLogout={handleLogout}
        />
      )}
      renderDrawerTitle={(closeMobileSidebar) => (
        <Link
          href="/studio/dashboard"
          className={styles.brand}
          onClick={closeMobileSidebar}
        >
          <span className={styles.brandText}>orot.studio</span>
        </Link>
      )}
      drawerFooter={
        <Button
          variant="text"
          size="md"
          block
          icon={<LogOut size={14} />}
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      }
      topbarActions={
        <>
          <ThemeSwitcher className={styles.iconButton} />
          <Button
            variant="text"
            size="sm"
            icon={<EditIcon size={14} />}
            onClick={navigateToEditor}
            className={styles.topbarAction}
          >
            에디터
          </Button>
          <Button
            variant="outlined"
            size="sm"
            icon={<ArrowUpRight size={14} />}
            iconPlacement="end"
            onClick={navigateToSite}
            className={styles.topbarAction}
          >
            사이트 보기
          </Button>
        </>
      }
    >
      {children}
    </ConsoleLayoutShell>
  );
}
