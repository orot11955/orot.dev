import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginPage } from '@/components/studio/LoginPage';
import { createRestrictedMetadata } from '@/utils/metadata';

export const metadata: Metadata = createRestrictedMetadata({
  section: 'Studio',
  title: '로그인',
  description: 'orot.dev 스튜디오 로그인 화면',
});

export default function StudioLoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
