'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * SSR에서 document/window를 직접 사용하는 컴포넌트를 감싸주는 래퍼.
 * hydration 이후에만 children을 렌더링합니다.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
