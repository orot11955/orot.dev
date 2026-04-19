'use client';

import { Button } from 'orot-ui';
import { ErrorAlert, type ErrorAlertProps } from '@/components/ErrorAlert';
import styles from './PageErrorState.module.css';

interface PageErrorStateProps {
  title?: ErrorAlertProps['title'];
  description?: ErrorAlertProps['description'];
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  showIcon?: boolean;
  closable?: boolean;
}

export function PageErrorState({
  title = '문제가 발생했습니다.',
  description,
  error,
  onRetry,
  retryLabel = '다시 시도',
  showIcon = true,
  closable = false,
}: PageErrorStateProps) {
  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.panel}>
          <ErrorAlert
            title={title}
            description={description}
            error={error}
            showIcon={showIcon}
            closable={closable}
          />

          {onRetry && (
            <div className={styles.actions}>
              <Button variant="outlined" size="md" onClick={onRetry}>
                {retryLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
