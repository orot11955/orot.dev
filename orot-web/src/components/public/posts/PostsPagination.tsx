'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from 'orot-ui';

interface PostsPaginationProps {
  current: number;
  total: number;
  pageSize: number;
}

export function PostsPagination({
  current,
  total,
  pageSize,
}: PostsPaginationProps) {
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
    router.push(queryString ? `/posts?${queryString}` : '/posts');
  };

  return (
    <Pagination
      current={current}
      total={total}
      pageSize={pageSize}
      onChange={handlePage}
      align="center"
      hideOnSinglePage
    />
  );
}
