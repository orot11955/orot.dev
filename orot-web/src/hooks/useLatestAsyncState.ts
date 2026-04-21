'use client';

import { useCallback, useRef, useState } from 'react';
import { getErrorMessage } from '@/utils/content';

interface UseLatestAsyncStateOptions {
  initialLoading?: boolean;
}

export function useLatestAsyncState(
  { initialLoading = true }: UseLatestAsyncStateOptions = {},
) {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const requestTokenRef = useRef(0);

  const runLatest = useCallback(async <T,>(task: () => Promise<T>) => {
    const token = ++requestTokenRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await task();
      return token === requestTokenRef.current ? result : null;
    } catch (err) {
      if (token === requestTokenRef.current) {
        setError(getErrorMessage(err));
      }
      return null;
    } finally {
      if (token === requestTokenRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const runAction = useCallback(async <T,>(task: () => Promise<T>) => {
    try {
      return await task();
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    setError,
    setLoading,
    clearError,
    runLatest,
    runAction,
  };
}
