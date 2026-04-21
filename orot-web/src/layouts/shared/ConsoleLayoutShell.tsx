'use client';

import { useState, type ReactNode } from 'react';
import { Button, Drawer, MenuIcon, Spin, X } from 'orot-ui';
import { ClientOnly } from '@/components/ClientOnly';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type ConsoleLayoutStyles = Readonly<Record<string, string>>;

interface ConsoleLayoutShellProps {
  styles: ConsoleLayoutStyles;
  children: ReactNode;
  drawerWidth: number;
  topbarActions?: ReactNode;
  drawerFooter?: ReactNode;
  authRedirectTo?: string;
  mobileTriggerLabel?: string;
  renderTitle: (className: string) => ReactNode;
  renderDesktopSidebar: () => ReactNode;
  renderMobileSidebar: (close: () => void) => ReactNode;
  renderDrawerTitle: (close: () => void) => ReactNode;
}

export function ConsoleLayoutShell({
  styles,
  children,
  drawerWidth,
  topbarActions,
  drawerFooter,
  authRedirectTo = '/studio/login',
  mobileTriggerLabel = '메뉴 열기',
  renderTitle,
  renderDesktopSidebar,
  renderMobileSidebar,
  renderDrawerTitle,
}: ConsoleLayoutShellProps) {
  const { isAuthenticated, isLoading } = useRequireAuth(authRedirectTo);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.fallback}>
        <Spin size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>{renderDesktopSidebar()}</aside>

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
              aria-label={mobileTriggerLabel}
            />
            {renderTitle(styles.pageTitle)}
          </div>

          {topbarActions ? (
            <div className={styles.topbarRight}>{topbarActions}</div>
          ) : null}
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      <ClientOnly>
        <Drawer
          open={mobileOpen}
          placement="left"
          width={drawerWidth}
          onClose={closeMobileSidebar}
          className={styles.mobileDrawer}
          title={renderDrawerTitle(closeMobileSidebar)}
          closeIcon={<X size={18} />}
          footer={drawerFooter}
        >
          {renderMobileSidebar(closeMobileSidebar)}
        </Drawer>
      </ClientOnly>
    </div>
  );
}
