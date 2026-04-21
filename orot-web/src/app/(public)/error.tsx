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
      status="Error"
      eyebrow="Public Page"
      title="페이지를 불러오는 중 문제가 발생했습니다."
      description="일시적인 문제일 수 있습니다. 다시 시도하거나 홈으로 이동해 다른 페이지를 둘러보세요."
      error={error}
      onRetry={reset}
      retryLabel="페이지 다시 불러오기"
    />
  );
}
