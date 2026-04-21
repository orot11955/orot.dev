import type { Metadata } from 'next';
import { PostsManagementPage } from '@/components/studio/posts/PostsManagementPage';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  title: '글 관리',
  description: '글을 작성, 발행, 편집 상태로 관리하는 화면',
});

export default function StudioPostsPage() {
  return <PostsManagementPage />;
}
