'use client';

import { Badge, Progress, Typography } from 'orot-ui';
import type { PostStatus } from '@/types';
import styles from './Dashboard.module.css';

interface PostStatusChartProps {
  data: Array<{ status: PostStatus; count: number }>;
}

export const STATUS_META: Record<
  PostStatus,
  { label: string; badge: 'success' | 'processing' | 'error' | 'default' | 'warning' }
> = {
  DRAFT: { label: '초안', badge: 'warning' },
  COMPLETED: { label: '완료', badge: 'warning' },
  REVIEW: { label: '검토', badge: 'error' },
  SCHEDULED: { label: '예약', badge: 'processing' },
  PUBLISHED: { label: '발행됨', badge: 'success' },
  UPDATED: { label: '수정됨', badge: 'error' },
  ARCHIVED: { label: '보관', badge: 'default' },
};

export function PostStatusChart({ data }: PostStatusChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  if (total === 0) {
    return <div className={styles.chartEmpty}>게시된 글이 없습니다.</div>;
  }

  return (
    <div className={styles.statusList}>
      {data.map(({ status, count }) => {
        const percent = total === 0 ? 0 : Math.round((count / total) * 100);
        const meta = STATUS_META[status];
        return (
          <div key={status} className={styles.statusRow}>
            <div className={styles.statusHeader}>
              <Badge status={meta.badge} text={meta.label} />
              <Typography.Text className={styles.statusCount}>
                {count.toLocaleString('ko-KR')}편 · {percent}%
              </Typography.Text>
            </div>
            <Progress
              percent={percent}
              showInfo={false}
              size="sm"
              strokeColor="var(--public-accent)"
            />
          </div>
        );
      })}
    </div>
  );
}
