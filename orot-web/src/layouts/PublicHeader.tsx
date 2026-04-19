'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  Drawer,
  Input,
  MenuIcon,
  Search,
  X,
} from 'orot-ui';
import { ClientOnly } from '@/components/ClientOnly';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import type { PublicMenuItem } from '@/types';
import styles from './PublicHeader.module.css';

interface PublicHeaderProps {
  siteName: string;
  nav: PublicMenuItem[];
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader({ siteName, nav }: PublicHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigateToStudio = () => {
    window.location.assign('/studio/dashboard');
  };

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) return;
    router.push(`/posts?search=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setKeyword('');
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <button
            type="button"
            className={styles.mobileTrigger}
            onClick={() => setMobileOpen(true)}
            aria-label="메뉴 열기"
          >
            <MenuIcon size={20} />
          </button>
          <Link href="/" className={styles.brand} aria-label={`${siteName} 홈`}>
            <span className={styles.brandMark}>●</span>
            <span className={styles.brandName}>{siteName}</span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label="주요 메뉴">
          {nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={[
                styles.navLink,
                isActive(pathname, item.href) ? styles.navLinkActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.right}>
          <form
            onSubmit={handleSubmit}
            className={[
              styles.search,
              searchOpen ? styles.searchOpen : '',
            ].join(' ')}
            role="search"
          >
            {searchOpen ? (
              <>
                <Input
                  size="sm"
                  autoFocus
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="글 검색..."
                  prefix={<Search size={14} />}
                  className={styles.searchInput}
                />
                <button
                  type="button"
                  className={styles.searchClose}
                  onClick={() => {
                    setSearchOpen(false);
                    setKeyword('');
                  }}
                  aria-label="검색 닫기"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.searchToggle}
                onClick={() => setSearchOpen(true)}
                aria-label="검색 열기"
              >
                <Search size={18} />
              </button>
            )}
          </form>

          <ThemeSwitcher className={styles.themeBtn} />

          <Button
            variant="outlined"
            size="sm"
            onClick={navigateToStudio}
            className={styles.studioBtn}
          >
            Studio
          </Button>
        </div>
      </div>

      <ClientOnly>
        <Drawer
          open={mobileOpen}
          placement="left"
          width={280}
          onClose={() => setMobileOpen(false)}
          title={<span className={styles.drawerTitle}>{siteName}</span>}
          closeIcon={<X size={18} />}
          className={styles.mobileDrawer}
        >
          <nav className={styles.drawerNav} aria-label="모바일 메뉴">
            {nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={[
                  styles.drawerLink,
                  isActive(pathname, item.href) ? styles.drawerLinkActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className={styles.drawerDivider} />
            <a href="/studio/dashboard" className={styles.drawerLink}>
              Studio
            </a>
          </nav>
        </Drawer>
      </ClientOnly>
    </header>
  );
}
