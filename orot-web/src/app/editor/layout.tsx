import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createRestrictedMetadata } from '@/utils/metadata';
import { EditorLayout } from '@/layouts/editor/EditorLayout';

export const metadata: Metadata = createRestrictedMetadata({
  section: '에디터',
  description: 'orot.dev 글을 작성하고 편집하는 내부 작업 화면',
});

export default function EditorRouteLayout({ children }: { children: ReactNode }) {
  return <EditorLayout>{children}</EditorLayout>;
}
