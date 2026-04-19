import type { ReactNode } from 'react';
import { StudioLayout } from '@/layouts/StudioLayout';

export default function StudioShellLayout({ children }: { children: ReactNode }) {
  return <StudioLayout>{children}</StudioLayout>;
}
