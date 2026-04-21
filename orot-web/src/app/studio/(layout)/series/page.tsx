import type { Metadata } from 'next';
import { SeriesManagementPage } from '@/components/studio/series/SeriesManagementPage';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  title: '시리즈 관리',
  description: '연재 시리즈를 생성하고 글 연결을 관리하는 화면',
});

export default function StudioSeriesPage() {
  return <SeriesManagementPage />;
}
