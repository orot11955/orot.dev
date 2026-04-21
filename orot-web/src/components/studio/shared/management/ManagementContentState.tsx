'use client';

import type { ReactNode } from 'react';
import { Empty, Spin } from 'orot-ui';

interface ManagementContentStateProps {
  className: string;
  loading: boolean;
  error?: string | null;
  hasData: boolean;
  emptyDescription: string;
  children: ReactNode;
  loadingPadding?: string;
}

export function ManagementContentState({
  className,
  loading,
  error,
  hasData,
  emptyDescription,
  children,
  loadingPadding = 'var(--orot-space-10)',
}: ManagementContentStateProps) {
  return (
    <div className={className}>
      {loading && !hasData ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: loadingPadding,
          }}
        >
          <Spin size="lg" />
        </div>
      ) : error && !hasData ? (
        <Empty description={error} />
      ) : !hasData ? (
        <Empty description={emptyDescription} />
      ) : (
        children
      )}
    </div>
  );
}
