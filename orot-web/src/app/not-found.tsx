'use client';

import { PageErrorState } from '@/components/PageErrorState';

export default function NotFoundPage() {

  return (
    <PageErrorState
      title="페이지를 찾을 수 없습니다."
      description="요청하신 페이지가 없거나 이동되었을 수 있습니다."
    />
  );
}
