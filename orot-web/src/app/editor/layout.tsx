import type { ReactNode } from 'react';
import { EditorLayout } from '@/layouts/EditorLayout';

export const metadata = {
  title: '에디터 · orot.dev',
};

export default function EditorRouteLayout({ children }: { children: ReactNode }) {
  return <EditorLayout>{children}</EditorLayout>;
}
