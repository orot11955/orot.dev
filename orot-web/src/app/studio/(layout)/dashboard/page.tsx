import type { Metadata } from 'next';
import { DashboardPage } from '@/components/studio/dashboard/DashboardPage';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  title: '대시보드',
  description: '방문자 추이와 게시물 상태를 확인하는 운영 대시보드',
});

export default function StudioDashboardPage() {
  return <DashboardPage />;
}
