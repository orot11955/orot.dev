import type { ReactNode } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';

export default function PublicRouteLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
