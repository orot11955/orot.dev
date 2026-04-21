import type { Metadata } from 'next';
import { CommentsManagementPage } from '@/components/studio/comments/CommentsManagementPage';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  title: '댓글 관리',
  description: '공개 댓글을 검토하고 상태를 관리하는 화면',
});

export default function StudioCommentsPage() {
  return <CommentsManagementPage />;
}
