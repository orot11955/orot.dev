'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PageErrorState } from '@/components/PageErrorState';
import { webClientLogger } from '@/logging/client';
import { THEME_INIT_SCRIPT } from '@/utils/theme-init';
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <PageErrorState
            status="App Error"
            eyebrow="Global Recovery"
            title="앱을 표시하는 중 문제가 발생했습니다."
            description="화면을 구성하는 중 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            error={error}
            onRetry={reset}
            retryLabel="앱 다시 시도"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
