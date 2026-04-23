'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X } from 'orot-ui';
import styles from './PublicFilterPanel.module.css';

interface PublicFilterPanelProps {
  search?: ReactNode;
  controls?: ReactNode;
  children?: ReactNode;
  hasResettableFilters?: boolean;
  resetLabel?: string;
  onReset?: () => void;
}

interface PublicFilterGroupProps {
  label: string;
  children: ReactNode;
}

interface PublicFilterChipProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function PublicFilterPanel({
  search,
  controls,
  children,
  hasResettableFilters = false,
  resetLabel = '필터 초기화',
  onReset,
}: PublicFilterPanelProps) {
  return (
    <section
      className={styles.panel}
      data-has-search={search ? 'true' : 'false'}
      aria-label="필터"
    >
      <div className={styles.topRow}>
        {search ? <div className={styles.search}>{search}</div> : null}
        {controls ? <div className={styles.controls}>{controls}</div> : null}
        {onReset ? (
          <button
            type="button"
            className={styles.reset}
            data-visible={hasResettableFilters ? 'true' : 'false'}
            aria-hidden={hasResettableFilters ? undefined : true}
            disabled={!hasResettableFilters}
            tabIndex={hasResettableFilters ? undefined : -1}
            onClick={onReset}
          >
            <X size={12} />
            {resetLabel}
          </button>
        ) : null}
      </div>
      {children ? <div className={styles.groups}>{children}</div> : null}
    </section>
  );
}

export function PublicFilterGroup({
  label,
  children,
}: PublicFilterGroupProps) {
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>{label}</span>
      <div className={styles.chipScroller} role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

export function PublicFilterChip({
  active = false,
  className,
  children,
  ...props
}: PublicFilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(styles.chip, active && styles.chipActive, className)}
      {...props}
    >
      {children}
    </button>
  );
}
