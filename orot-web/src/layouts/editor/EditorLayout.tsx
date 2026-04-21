'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowUpRight,
  Button,
} from 'orot-ui';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { EditorSidebar } from '@/components/editor/EditorSidebar';
import { ConsoleLayoutShell } from '../shared/ConsoleLayoutShell';
import styles from './EditorLayout.module.css';

const EditorRefreshContext = createContext<() => void>(() => {});

export function EditorLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id?: string }>();
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

  return (
    <ConsoleLayoutShell
      styles={styles}
      drawerWidth={320}
      renderTitle={(className) => (
        <Link href="/editor" className={className}>
          orot.editor
        </Link>
      )}
      renderDesktopSidebar={() => (
        <EditorSidebar
          activeId={activeId}
          refreshToken={refreshToken}
        />
      )}
      renderMobileSidebar={(closeMobileSidebar) => (
        <EditorSidebar
          activeId={activeId}
          refreshToken={refreshToken}
          onNavigate={closeMobileSidebar}
        />
      )}
      renderDrawerTitle={() => <span>orot.editor</span>}
      topbarActions={
        <>
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
        </>
      }
    >
      <EditorRefreshContext.Provider value={handleRefresh}>
        {children}
      </EditorRefreshContext.Provider>
    </ConsoleLayoutShell>
  );
}

export function useEditorRefresh() {
  return useContext(EditorRefreshContext);
}
