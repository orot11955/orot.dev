'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PageErrorState } from '@/components/PageErrorState';
import { webClientLogger } from '@/logging/client';
import '@/styles/globals.css';

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    webClientLogger.error('next.global_error', error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body style={{ background: 'var(--orot-color-bg, var(--background))' }}>
        <ThemeProvider>
          <PageErrorState
            title="앱을 표시하는 중 오류가 발생했습니다."
            error={error}
            onRetry={reset}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
