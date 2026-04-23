import type { Metadata } from 'next';
import { SettingsPage } from '@/components/studio/settings/SettingsPage';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  title: '설정',
  description: '사이트, 소개, SEO, 전역 링크 설정을 관리하는 화면',
});

export default function StudioSettingsPage() {
  return <SettingsPage />;
}
