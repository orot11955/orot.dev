'use client';

import type { ReactNode } from 'react';
import { Button, Input } from 'orot-ui';
import styles from './ManagementToolbar.module.css';

interface ManagementToolbarProps {
  className?: string;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchReset: () => void;
  resetLabel?: string;
  submitLabel?: string;
  children?: ReactNode;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function ManagementToolbar({
  className,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSearchSubmit,
  onSearchReset,
  resetLabel = '필터 초기화',
  submitLabel = '검색',
  children,
}: ManagementToolbarProps) {
  return (
    <div
      className={classNames(styles.toolbar, className)}
      data-has-filters={children ? 'true' : 'false'}
    >
      {children ? <div className={styles.filters}>{children}</div> : null}
      <div className={styles.search}>
        <Input
          value={searchValue}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSearchSubmit();
            }
          }}
        />
      </div>
      <div className={styles.actions}>
        <Button size="md" variant="outlined" onClick={onSearchReset}>
          {resetLabel}
        </Button>
        <Button size="md" variant="solid" onClick={onSearchSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
