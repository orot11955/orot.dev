'use client';

import { useRouter } from 'next/navigation';
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
  status?: string;
  eyebrow?: string;
  homeHref?: string;
  homeLabel?: string;
  backLabel?: string;
  showHomeAction?: boolean;
  showBackAction?: boolean;
}

export function PageErrorState({
  title = '문제가 발생했습니다.',
  description,
  error,
  onRetry,
  retryLabel = '다시 시도',
  showIcon = true,
  closable = false,
  status = 'ERROR',
  eyebrow = 'RECOVERY',
  homeHref = '/',
  homeLabel = '홈으로 이동',
  backLabel = '이전 페이지',
  showHomeAction = true,
  showBackAction = true,
}: PageErrorStateProps) {
  const router = useRouter();
  const resolvedDescription =
    description ??
    (error
      ? '일시적인 문제일 수 있습니다. 잠시 후 다시 시도해주세요.'
      : '요청하신 화면을 다시 확인해보세요.');

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();

      return;
    }

    router.push(homeHref);
  };

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.meta}>
              <span className={styles.status}>{status}</span>
              <span className={styles.eyebrow}>{eyebrow}</span>
            </div>

            <div className={styles.copy}>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.description}>{resolvedDescription}</p>
            </div>

            <div className={styles.actions}>
              {onRetry && (
                <Button variant="solid" size="md" onClick={onRetry}>
                  {retryLabel}
                </Button>
              )}
              {showHomeAction && (
                <Button
                  variant={onRetry ? 'outlined' : 'solid'}
                  size="md"
                  onClick={() => router.push(homeHref)}
                >
                  {homeLabel}
                </Button>
              )}
              {showBackAction && (
                <Button variant="text" size="md" onClick={handleBack}>
                  {backLabel}
                </Button>
              )}
            </div>

            {error ? (
              <div className={styles.diagnostics}>
                <ErrorAlert
                  title="오류 상세"
                  error={error}
                  showIcon={showIcon}
                  closable={closable}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
