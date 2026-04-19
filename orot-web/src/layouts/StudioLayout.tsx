'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Button,
  Drawer,
  EditIcon,
  LogOut,
  MenuIcon,
  Spin,
  X,
} from 'orot-ui';
import { ClientOnly } from '@/components/ClientOnly';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { StudioSidebar } from './StudioSidebar';
import { STUDIO_NAV } from './studio-nav';
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
  const { isAuthenticated, isLoading } = useRequireAuth('/studio/login');
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel = getActiveLabel(pathname);

  const navigateToEditor = () => {
    window.location.assign('/editor');
  };

  const navigateToSite = () => {
    window.location.assign('/');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.fallback}>
        <Spin size="lg" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/studio/login');
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <StudioSidebar
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <Button
              type="button"
              variant="text"
              size="sm"
              shape="circle"
              icon={<MenuIcon size={18} />}
              onClick={() => setMobileOpen(true)}
              className={styles.mobileTrigger}
              aria-label="메뉴 열기"
            />
            <h1 className={styles.pageTitle}>{activeLabel}</h1>
          </div>

          <div className={styles.topbarRight}>
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
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      <ClientOnly>
        <Drawer
          open={mobileOpen}
          placement="left"
          width={300}
          onClose={() => setMobileOpen(false)}
          className={styles.mobileDrawer}
          title={
            <Link
              href="/studio/dashboard"
              className={styles.brand}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.brandText}>orot.studio</span>
            </Link>
          }
          closeIcon={<X size={18} />}
          footer={
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
        >
          <StudioSidebar
            pathname={pathname}
            user={user}
            variant="mobile"
            onNavigate={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />
        </Drawer>
      </ClientOnly>
    </div>
  );
}
