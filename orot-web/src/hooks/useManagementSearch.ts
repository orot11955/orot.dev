'use client';

import { useCallback, useState } from 'react';

interface UseManagementSearchOptions {
  initialSearch?: string;
  resetPage?: () => void;
}

export function useManagementSearch(
  {
    initialSearch = '',
    resetPage,
  }: UseManagementSearchOptions = {},
) {
  const [search, setSearch] = useState(initialSearch);
  const [pendingSearch, setPendingSearch] = useState(initialSearch);

  const submitSearch = useCallback(() => {
    setSearch(pendingSearch.trim());
    resetPage?.();
  }, [pendingSearch, resetPage]);

  const resetSearch = useCallback(() => {
    setPendingSearch('');
    setSearch('');
    resetPage?.();
  }, [resetPage]);

  return {
    search,
    pendingSearch,
    setPendingSearch,
    submitSearch,
    resetSearch,
  };
}
