'use client';

import type { ReactNode } from 'react';
import { Typography } from 'orot-ui';

interface ManagementPageHeaderClassNames {
  header: string;
  headerText: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  side?: string;
}

interface ManagementPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  side?: ReactNode;
  classNames: ManagementPageHeaderClassNames;
}

export function ManagementPageHeader({
  eyebrow,
  title,
  description,
  side,
  classNames,
}: ManagementPageHeaderProps) {
  return (
    <header className={classNames.header}>
      <div className={classNames.headerText}>
        <Typography.Text className={classNames.eyebrow}>
          {eyebrow}
        </Typography.Text>
        <Typography.Title level={2} className={classNames.title}>
          {title}
        </Typography.Title>
        <Typography.Paragraph className={classNames.subtitle}>
          {description}
        </Typography.Paragraph>
      </div>
      {side ? <div className={classNames.side}>{side}</div> : null}
    </header>
  );
}
