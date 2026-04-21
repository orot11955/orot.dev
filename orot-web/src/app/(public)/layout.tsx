import type { ReactNode } from 'react';
import { PublicLayout } from '@/layouts/public/PublicLayout';

export default function PublicRouteLayout({ children }: { children: ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
