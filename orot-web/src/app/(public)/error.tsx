'use client';

import { useEffect } from 'react';
import { PageErrorState } from '@/components/PageErrorState';
import { webClientLogger } from '@/logging/client';

interface PublicErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PublicErrorPage({
  error,
  reset,
}: PublicErrorPageProps) {
  useEffect(() => {
    webClientLogger.error('next.public_error', error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <PageErrorState
      title="페이지를 불러오는 중 오류가 발생했습니다."
      error={error}
      onRetry={reset}
    />
  );
}
