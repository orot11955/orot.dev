'use client';

import { PageErrorState } from '@/components/PageErrorState';

export default function NotFoundPage() {
  return (
    <PageErrorState
      status="404"
      eyebrow="Not Found"
      title="페이지를 찾을 수 없습니다."
      description="주소가 바뀌었거나 삭제된 페이지일 수 있습니다. 홈으로 돌아가 다른 경로로 다시 찾아보세요."
    />
  );
}
