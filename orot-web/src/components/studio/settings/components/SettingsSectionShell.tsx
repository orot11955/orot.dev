'use client';

import type { ReactNode } from 'react';
import { Typography } from 'orot-ui';
import styles from '../SettingsPage.module.css';

interface SettingsSectionShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function SettingsSectionShell({
  title,
  description,
  children,
  footer,
}: SettingsSectionShellProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Typography.Title level={3} className={styles.sectionTitle}>
          {title}
        </Typography.Title>
        <Typography.Paragraph className={styles.sectionDesc}>
          {description}
        </Typography.Paragraph>
      </div>

      {children}

      {footer ? (
        <div className={styles.actions}>{footer}</div>
      ) : null}
    </div>
  );
}
