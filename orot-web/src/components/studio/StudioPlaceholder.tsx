'use client';

import type { ReactNode } from 'react';
import { Typography } from 'orot-ui';
import styles from './StudioPlaceholder.module.css';

interface StudioPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function StudioPlaceholder({
  eyebrow,
  title,
  description,
  children,
}: StudioPlaceholderProps) {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <Typography.Text className={styles.eyebrow}>{eyebrow}</Typography.Text>
        <Typography.Title level={2} className={styles.title}>
          {title}
        </Typography.Title>
        <Typography.Paragraph className={styles.description}>
          {description}
        </Typography.Paragraph>
      </header>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  );
}
