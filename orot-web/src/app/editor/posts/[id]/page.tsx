import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditorWorkspace } from '@/components/editor/EditorWorkspace';
import { createRestrictedMetadata } from '@/utils/metadata';

interface EditorPostPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = createRestrictedMetadata({
  section: '에디터',
  title: '글 편집',
  description: '선택한 글의 본문과 메타데이터를 편집하는 작업 화면',
});

export default async function EditorPostPage({ params }: EditorPostPageProps) {
  const { id } = await params;
  const postId = Number.parseInt(id, 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    notFound();
  }
  return <EditorWorkspace postId={postId} />;
}
