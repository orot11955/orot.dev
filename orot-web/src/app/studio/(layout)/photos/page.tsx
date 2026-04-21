import type { Metadata } from 'next';
import { PhotosManagementPage } from '@/components/studio/photos/PhotosManagementPage';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  title: '사진 관리',
  description: '퍼블릭 갤러리에 공개할 사진과 메타데이터를 관리하는 화면',
});

export default function StudioPhotosPage() {
  return <PhotosManagementPage />;
}
