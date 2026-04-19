'use client';

import { Alert, type AlertProps } from 'orot-ui';
import { getErrorMessage } from '@/utils/content';
import styles from './ErrorAlert.module.css';

export interface ErrorAlertProps
  extends Omit<AlertProps, 'type' | 'message' | 'title'> {
  error?: unknown;
  title?: AlertProps['title'];
  message?: AlertProps['message'];
}

export function ErrorAlert({
  error,
  title,
  message,
  description,
  showIcon = true,
  closable = true,
  className,
  ...rest
}: ErrorAlertProps) {
  const resolvedMessage = message ?? title ?? '오류가 발생했습니다.';
  const resolvedDescription =
    description !== undefined
      ? description
      : error
        ? getErrorMessage(error)
        : '잠시 후 다시 시도해주세요.';

  return (
    <Alert
      type="error"
      message={resolvedMessage}
      description={resolvedDescription}
      showIcon={showIcon}
      closable={closable}
      className={[styles.alert, className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
