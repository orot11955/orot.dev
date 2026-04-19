'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Button,
  Drawer,
  MenuIcon,
  Spin,
  X,
} from 'orot-ui';
import { ClientOnly } from '@/components/ClientOnly';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { EditorSidebar } from '@/components/editor/EditorSidebar';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import styles from './EditorLayout.module.css';

export function EditorLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id?: string }>();
  const { isAuthenticated, isLoading } = useRequireAuth('/studio/login');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const activeId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    const parsed = Number.parseInt(String(raw), 10);
    return Number.isInteger(parsed) ? parsed : null;
  }, [params?.id]);

  const handleRefresh = useCallback(() => {
    setRefreshToken((v) => v + 1);
  }, []);

  const navigateToStudio = useCallback(() => {
    window.location.assign('/studio/dashboard');
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.fallback}>
        <Spin size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <EditorSidebar
          activeId={activeId}
          refreshToken={refreshToken}
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
            <Link href="/editor" className={styles.pageTitle}>
              orot.editor
            </Link>
          </div>
          <div className={styles.topbarRight}>
            <ThemeSwitcher className={styles.iconButton} />
            <Button
              variant="outlined"
              size="sm"
              icon={<ArrowUpRight size={14} />}
              iconPlacement="end"
              onClick={navigateToStudio}
            >
              스튜디오
            </Button>
          </div>
        </header>

        <main className={styles.content}>
          <EditorRefreshContext.Provider value={handleRefresh}>
            {children}
          </EditorRefreshContext.Provider>
        </main>
      </div>

      <ClientOnly>
        <Drawer
          open={mobileOpen}
          placement="left"
          width={320}
          onClose={() => setMobileOpen(false)}
          className={styles.mobileDrawer}
          title={<span>orot.editor</span>}
          closeIcon={<X size={18} />}
        >
          <EditorSidebar
            activeId={activeId}
            refreshToken={refreshToken}
            onNavigate={() => setMobileOpen(false)}
          />
        </Drawer>
      </ClientOnly>
    </div>
  );
}

import { createContext, useContext } from 'react';

const EditorRefreshContext = createContext<() => void>(() => {});

export function useEditorRefresh() {
  return useContext(EditorRefreshContext);
}
