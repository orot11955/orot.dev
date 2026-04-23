'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type FilterParamValue = string | number | boolean | null | undefined;

export function useFilterParams(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (patch: Record<string, FilterParamValue>) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
          return;
        }

        next.set(key, String(value));
      });

      next.delete('page');

      const queryString = next.toString();
      router.push(queryString ? `${basePath}?${queryString}` : basePath);
    },
    [basePath, router, searchParams],
  );

  const resetParams = useCallback(() => {
    router.push(basePath);
  }, [basePath, router]);

  return {
    updateParams,
    resetParams,
  };
}
