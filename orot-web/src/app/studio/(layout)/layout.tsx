import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { createRestrictedMetadata } from '@/utils/metadata';
import { StudioLayout } from '@/layouts/studio/StudioLayout';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  description: 'orot.dev 콘텐츠를 관리하는 내부 운영 화면',
});

export default function StudioShellLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <StudioLayout>{children}</StudioLayout>
    </AuthProvider>
  );
}
