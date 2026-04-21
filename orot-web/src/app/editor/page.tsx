import type { Metadata } from 'next';
import { EditorEmptyState } from '@/components/editor/EditorEmptyState';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: '에디터',
  title: '홈',
  description: '편집할 글을 선택하거나 새 글 작업을 시작하는 화면',
});

export default function EditorIndexPage() {
  return <EditorEmptyState />;
}
