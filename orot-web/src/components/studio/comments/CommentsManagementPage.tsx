'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Select,
  Table,
} from 'orot-ui';
import type { ColumnType } from 'orot-ui';
import {
  useLatestAsyncState,
  useManagementSearch,
  useNotificationEffect,
} from '@/hooks';
import { studioCommentsService } from '@/services';
import type { Comment, CommentQuery } from '@/types';
import {
  ManagementActionGroup,
  type ManagementActionItem,
} from '@/components/studio/shared/actions/ManagementActionGroup';
import { ManagementContentState } from '@/components/studio/shared/management/ManagementContentState';
import { ManagementPageHeader } from '@/components/studio/shared/management/ManagementPageHeader';
import { ManagementToolbar } from '@/components/studio/shared/management/ManagementToolbar';
import styles from './CommentsManagement.module.css';

type StatusValue = 'ALL' | 'APPROVED' | 'PENDING' | 'FILTERED';

type CommentRow = { [K in keyof Comment]: Comment[K] };

const STATUS_OPTIONS: Array<{ value: StatusValue; label: string }> = [
  { value: 'PENDING', label: '필터링 대기' },
  { value: 'APPROVED', label: '공개됨' },
  { value: 'FILTERED', label: '미승인' },
  { value: 'ALL', label: '전체' },
];

const DEFAULT_LIMIT = 10;

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function resolveStatusBadge(comment: Comment): {
  label: string;
  badge: 'success' | 'processing' | 'error' | 'default' | 'warning';
} {
  if (comment.status === 'PENDING') {
    return { label: '필터링 대기', badge: 'warning' as const };
  }
  if (comment.status === 'FILTERED') {
    return { label: '미승인', badge: 'default' as const };
  }
  if (comment.status === 'APPROVED') {
    return { label: '공개됨', badge: 'success' as const };
  }
  return { label: '알 수 없음', badge: 'default' as const };
}

export function CommentsManagementPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusValue>('PENDING');
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const {
    loading,
    error,
    runLatest,
    runAction,
  } = useLatestAsyncState();
  const {
    search,
    pendingSearch,
    setPendingSearch,
    submitSearch,
    resetSearch,
  } = useManagementSearch({
    resetPage: () => setPage(1),
  });

  useNotificationEffect(error, {
    type: 'error',
    title: '요청을 처리하지 못했습니다.',
  });

  const load = useCallback(async () => {
    const result = await runLatest(async () => {
      const query: CommentQuery = {
        page,
        limit: DEFAULT_LIMIT,
      };
      if (status !== 'ALL') query.status = status;

      return studioCommentsService.getAll(query);
    });

    if (!result) {
      return;
    }

    const normalizedQuery = search.trim().toLowerCase();
    const filtered = normalizedQuery
      ? result.data.filter((comment) => {
          const haystack = [
            comment.content,
            comment.authorName,
            comment.authorEmail,
            comment.post?.title ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : result.data;

    setComments(filtered);
    setTotal(result.total);
  }, [page, status, search, runLatest]);

  const loadStats = useCallback(async () => {
    try {
      const [filteredRes, approvedRes] = await Promise.all([
        studioCommentsService.getAll({ status: 'FILTERED', page: 1, limit: 1 }),
        studioCommentsService.getAll({ status: 'APPROVED', page: 1, limit: 1 }),
      ]);
      setFilteredCount(filteredRes.total);
      setApprovedCount(approvedRes.total);
    } catch {
      // Stat load failure is non-blocking.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats, comments]);

  const handleApprove = useCallback(async (comment: Comment) => {
    setMutatingId(comment.id);
    try {
      const result = await runAction(() => studioCommentsService.approve(comment.id));
      if (!result) return;
      await load();
    } finally {
      setMutatingId(null);
    }
  }, [load, runAction]);

  const handleDelete = useCallback(async (comment: Comment) => {
    setMutatingId(comment.id);
    try {
      const result = await runAction(() => studioCommentsService.remove(comment.id));
      if (result === null) return;
      await load();
    } finally {
      setMutatingId(null);
    }
  }, [load, runAction]);

  const columns = useMemo<ColumnType<CommentRow>[]>(
    () => [
      {
        key: 'content',
        title: '댓글',
        render: (_value, comment) => (
          <div className={styles.contentCell}>
            <div className={styles.contentText}>{comment.content}</div>
            <div className={styles.contentMeta}>
              <span className={styles.authorName}>{comment.authorName}</span>
              <span className={styles.authorEmail}>{comment.authorEmail}</span>
              {comment.parent && (
                <span className={styles.parentRef}>
                  ↳ {comment.parent.authorName}님에게 답글
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'post',
        title: '글',
        width: 220,
        render: (_value, comment) => {
          if (!comment.post) {
            return <span className={styles.postMeta}>삭제된 글</span>;
          }
          return (
            <div className={styles.postCell}>
              <Link
                href={`/posts/${comment.post.slug}`}
                target="_blank"
                className={styles.postLink}
              >
                {comment.post.title}
              </Link>
              <span className={styles.postMeta}>#{comment.post.id}</span>
            </div>
          );
        },
      },
      {
        key: 'status',
        title: '상태',
        width: 120,
        render: (_value, comment) => {
          const meta = resolveStatusBadge(comment);
          return <Badge status={meta.badge} text={meta.label} />;
        },
      },
      {
        key: 'createdAt',
        title: '작성일',
        width: 160,
        render: (_value, comment) => (
          <span className={styles.dateCell}>
            {formatDateTime(comment.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        title: '관리',
        width: 200,
        render: (_value, comment) => {
          const busy = mutatingId === comment.id;
          const canApprove = comment.status !== 'APPROVED';
          const actions: ManagementActionItem[] = [];

          if (canApprove) {
            actions.push({
              key: 'approve',
              label: '승인',
              variant: 'solid',
              disabled: busy,
              onClick: () => handleApprove(comment),
            });
          }

          actions.push({
            key: 'delete',
            label: '삭제',
            variant: 'text',
            disabled: busy,
            confirm: {
              title: '삭제하시겠습니까?',
              description: '삭제된 댓글은 복구할 수 없습니다.',
              okText: '삭제',
              cancelText: '취소',
              onConfirm: () => handleDelete(comment),
            },
          });

          return <ManagementActionGroup className={styles.actions} actions={actions} />;
        },
      },
    ],
    [handleApprove, handleDelete, mutatingId],
  );

  return (
    <div className={styles.page}>
      <ManagementPageHeader
        eyebrow="Comments"
        title="댓글 관리"
        description="필터링 키워드에 걸린 댓글만 승인 대기로 넘어오고, 나머지는 자동 공개됩니다. 여기에서 승인·삭제를 처리합니다."
        classNames={{
          header: styles.header,
          headerText: styles.headerText,
          eyebrow: styles.eyebrow,
          title: styles.title,
          subtitle: styles.subtitle,
          side: styles.headerStats,
        }}
        side={
          <>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>필터링 대기</span>
            <span className={styles.statValue}>
              {filteredCount.toLocaleString('ko-KR')}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>공개됨</span>
            <span className={styles.statValue}>
              {approvedCount.toLocaleString('ko-KR')}
            </span>
          </div>
          </>
        }
      />

      <ManagementToolbar
        className={styles.toolbar}
        actionsClassName={styles.toolbarActions}
        searchValue={pendingSearch}
        searchPlaceholder="내용·작성자·글 제목 검색"
        onSearchChange={setPendingSearch}
        onSearchSubmit={submitSearch}
        onSearchReset={resetSearch}
      >
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus((value as StatusValue) ?? 'FILTERED');
            setPage(1);
          }}
        />
      </ManagementToolbar>

      <ManagementContentState
        className={styles.tableCard}
        loading={loading}
        error={error}
        hasData={comments.length > 0}
        emptyDescription="조건에 맞는 댓글이 없습니다."
      >
          <Table<CommentRow>
            columns={columns}
            dataSource={comments}
            rowKey="id"
            loading={loading}
            size="md"
            pagination={{
              current: page,
              pageSize: DEFAULT_LIMIT,
              total,
              hideOnSinglePage: true,
              onChange: (nextPage) => setPage(nextPage),
            }}
          />
      </ManagementContentState>
    </div>
  );
}
