import { notFound } from 'next/navigation';
import { EditorWorkspace } from '@/components/editor/EditorWorkspace';

interface EditorPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPostPage({ params }: EditorPostPageProps) {
  const { id } = await params;
  const postId = Number.parseInt(id, 10);
  if (!Number.isInteger(postId) || postId <= 0) {
    notFound();
  }
  return <EditorWorkspace postId={postId} />;
}
