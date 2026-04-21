'use client';

import Link from 'next/link';
import { Avatar, Button, LogOut, Menu } from 'orot-ui';
import { useRouter } from 'next/navigation';
import { STUDIO_NAV } from './studio-navigation';
import type { User } from '@/types';
import styles from './StudioLayout.module.css';

interface StudioSidebarProps {
  pathname: string;
  user: User | null;
  onLogout: () => void;
  onNavigate?: () => void;
  variant?: 'desktop' | 'mobile';
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioSidebar({
  pathname,
  user,
  onLogout,
  onNavigate,
  variant = 'desktop',
}: StudioSidebarProps) {
  const router = useRouter();
  const activeKey =
    STUDIO_NAV.find(({ href, exact }) => isActive(pathname, href, exact))?.href;

  const items = STUDIO_NAV.map(({ href, label, icon: Icon }) => ({
    key: href,
    label,
    icon: <Icon size={16} />,
  }));

  const handleClick = (key: string) => {
    router.push(key);
    onNavigate?.();
  };

  return (
    <div
      className={[
        styles.sidebarInner,
        variant === 'mobile' ? styles.sidebarMobile : '',
      ].join(' ')}
    >
      {variant === 'desktop' && (
        <Link href="/studio/dashboard" className={styles.brand}>
          <span className={styles.brandText}>orot.studio</span>
        </Link>
      )}

      <nav className={styles.sidebarNav} aria-label="스튜디오 네비게이션">
        <Menu
          mode="inline"
          items={items}
          selectedKeys={activeKey ? [activeKey] : []}
          onClick={({ key }) => handleClick(String(key))}
          className={styles.sidebarMenu}
        />
      </nav>

      {variant === 'desktop' && (
        <div className={styles.sidebarFooter}>
          {user && (
            <div className={styles.userCard}>
              <Avatar size="sm">{user.username.slice(0, 1).toUpperCase()}</Avatar>
              <div className={styles.userMeta}>
                <span className={styles.userName}>{user.username}</span>
                <span className={styles.userRole}>{user.role}</span>
              </div>
            </div>
          )}
          <Button
            variant="text"
            size="sm"
            block
            icon={<LogOut size={14} />}
            onClick={onLogout}
            className={styles.logoutButton}
          >
            로그아웃
          </Button>
        </div>
      )}
    </div>
  );
}
