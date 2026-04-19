'use client';

import { useEffect } from 'react';
import {
  notification,
  type NotificationConfig,
  type NotificationType,
} from 'orot-ui';

interface UseNotificationEffectOptions {
  type?: NotificationType;
  title?: NotificationConfig['message'];
  placement?: NotificationConfig['placement'];
  duration?: NotificationConfig['duration'];
}

export function useNotificationEffect(
  content: NotificationConfig['message'] | null | undefined,
  {
    type = 'info',
    title,
    placement = 'topRight',
    duration = 4.5,
  }: UseNotificationEffectOptions = {},
) {
  useEffect(() => {
    if (content === null || content === undefined || content === '') {
      return;
    }

    const config: NotificationConfig = {
      message: title ?? content,
      placement,
      duration,
      closable: true,
      ...(title ? { description: content } : {}),
    };

    if (type === 'success') {
      notification.success(config);
      return;
    }

    if (type === 'warning') {
      notification.warning(config);
      return;
    }

    if (type === 'error') {
      notification.error(config);
      return;
    }

    notification.info(config);
  }, [content, duration, placement, title, type]);
}
