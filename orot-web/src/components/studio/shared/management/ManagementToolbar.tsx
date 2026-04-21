'use client';

import type { ReactNode } from 'react';
import { Button, Input } from 'orot-ui';

interface ManagementToolbarProps {
  className: string;
  actionsClassName: string;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchReset: () => void;
  children?: ReactNode;
}

export function ManagementToolbar({
  className,
  actionsClassName,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSearchSubmit,
  onSearchReset,
  children,
}: ManagementToolbarProps) {
  return (
    <div className={className}>
      {children}
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
      <div className={actionsClassName}>
        <Button size="md" variant="outlined" onClick={onSearchReset}>
          초기화
        </Button>
        <Button size="md" variant="solid" onClick={onSearchSubmit}>
          검색
        </Button>
      </div>
    </div>
  );
}
