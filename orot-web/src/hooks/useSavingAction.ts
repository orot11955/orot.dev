'use client';

import { useCallback, useState } from 'react';

export function useSavingAction() {
  const [saving, setSaving] = useState(false);

  const runSaving = useCallback(async <T,>(task: () => Promise<T>) => {
    setSaving(true);
    try {
      return await task();
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    saving,
    runSaving,
  };
}
