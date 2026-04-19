'use client';

import { useEffect } from 'react';
import { webClientLogger } from '@/logging/client';

function toError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof reason === 'string') {
    return new Error(reason);
  }

  return new Error('Unknown client runtime error');
}

export function ClientLogBridge() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      webClientLogger.error('client.window.error', toError(event.error ?? event.message), {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      webClientLogger.error(
        'client.unhandled_rejection',
        toError(event.reason),
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
    };
  }, []);

  return null;
}
