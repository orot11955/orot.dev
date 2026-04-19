import { Suspense } from 'react';
import { LoginPage } from '@/components/studio/LoginPage';

export const metadata = {
  title: 'Studio 로그인 · orot.dev',
};

export default function StudioLoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
