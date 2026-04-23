import type { Metadata } from 'next';
import { PageErrorState } from '@/components/PageErrorState';
import { createNoIndexRobots } from '@/utils/metadata';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 | orot.dev',
  description: '요청한 페이지를 찾을 수 없습니다.',
  robots: createNoIndexRobots(),
};

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
