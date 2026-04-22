'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from 'orot-ui';

interface PhotosPaginationProps {
  current: number;
  total: number;
  pageSize: number;
}

export function PhotosPagination({
  current,
  total,
  pageSize,
}: PhotosPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePage = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());

    if (page <= 1) {
      next.delete('page');
    } else {
      next.set('page', String(page));
    }

    const queryString = next.toString();
    router.push(queryString ? `/photos?${queryString}` : '/photos');
  };

  return (
    <Pagination
      current={current}
      total={total}
      pageSize={pageSize}
      align="center"
      hideOnSinglePage
      onChange={handlePage}
    />
  );
}
