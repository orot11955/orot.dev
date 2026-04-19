'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Empty,
  Input,
  Popconfirm,
  Select,
  Spin,
  Table,
  Typography,
} from 'orot-ui';
import type { ColumnType } from 'orot-ui';
import { studioCommentsService } from '@/services';
import type { Comment, CommentQuery } from '@/types';
import { getErrorMessage } from '@/utils/content';
import styles from './CommentsManagement.module.css';

type StatusValue = 'all' | 'approved' | 'pending' | 'filtered';

type CommentRow = { [K in keyof Comment]: Comment[K] };

const STATUS_OPTIONS: Array<{ value: StatusValue; label: string }> = [
  { value: 'filtered', label: '필터링 대기' },
  { value: 'approved', label: '공개됨' },
  { value: 'pending', label: '미승인' },
  { value: 'all', label: '전체' },
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
  if (comment.isFiltered && !comment.isApproved) {
    return { label: '필터링', badge: 'warning' };
  }
  if (!comment.isApproved) {
    return { label: '미승인', badge: 'default' };
  }
  return { label: '공개됨', badge: 'success' };
}

export function CommentsManagementPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusValue>('filtered');
  const [pendingSearch, setPendingSearch] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const reloadTokenRef = useRef(0);

  const load = useCallback(async () => {
    const token = ++reloadTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const query: CommentQuery = {
        page,
        limit: DEFAULT_LIMIT,
      };
      if (status !== 'all') query.status = status;

      const result = await studioCommentsService.getAll(query);
      if (token !== reloadTokenRef.current) return;

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
    } catch (err) {
      if (token !== reloadTokenRef.current) return;
      setError(getErrorMessage(err));
    } finally {
      if (token === reloadTokenRef.current) setLoading(false);
    }
  }, [page, status, search]);

  const loadStats = useCallback(async () => {
    try {
      const [filteredRes, approvedRes] = await Promise.all([
        studioCommentsService.getAll({ status: 'filtered', page: 1, limit: 1 }),
        studioCommentsService.getAll({ status: 'approved', page: 1, limit: 1 }),
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

  const submitSearch = useCallback(() => {
    setSearch(pendingSearch.trim());
    setPage(1);
  }, [pendingSearch]);

  const resetSearch = useCallback(() => {
    setPendingSearch('');
    setSearch('');
    setPage(1);
  }, []);

  const handleApprove = useCallback(async (comment: Comment) => {
    setMutatingId(comment.id);
    try {
      await studioCommentsService.approve(comment.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMutatingId(null);
    }
  }, [load]);

  const handleDelete = useCallback(async (comment: Comment) => {
    setMutatingId(comment.id);
    try {
      await studioCommentsService.remove(comment.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMutatingId(null);
    }
  }, [load]);

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
          const canApprove = !comment.isApproved || comment.isFiltered;

          return (
            <div className={styles.actions}>
              {canApprove && (
                <Button
                  size="sm"
                  variant="solid"
                  disabled={busy}
                  onClick={() => handleApprove(comment)}
                >
                  승인
                </Button>
              )}
              <Popconfirm
                title="삭제하시겠습니까?"
                description="삭제된 댓글은 복구할 수 없습니다."
                okText="삭제"
                cancelText="취소"
                onConfirm={() => handleDelete(comment)}
              >
                <Button size="sm" variant="text" disabled={busy}>
                  삭제
                </Button>
              </Popconfirm>
            </div>
          );
        },
      },
    ],
    [handleApprove, handleDelete, mutatingId],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <Typography.Text className={styles.eyebrow}>Comments</Typography.Text>
          <Typography.Title level={2} className={styles.title}>
            댓글 관리
          </Typography.Title>
          <Typography.Paragraph className={styles.subtitle}>
            필터링 키워드에 걸린 댓글만 승인 대기로 넘어오고, 나머지는 자동 공개됩니다. 여기에서 승인·삭제를 처리합니다.
          </Typography.Paragraph>
        </div>
        <div className={styles.headerStats}>
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
        </div>
      </header>

      <div className={styles.toolbar}>
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus((value as StatusValue) ?? 'filtered');
            setPage(1);
          }}
        />
        <Input
          value={pendingSearch}
          placeholder="내용·작성자·글 제목 검색"
          onChange={(event) => setPendingSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitSearch();
          }}
        />
        <div className={styles.toolbarActions}>
          <Button size="md" variant="outlined" onClick={resetSearch}>
            초기화
          </Button>
          <Button size="md" variant="solid" onClick={submitSearch}>
            검색
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message="요청을 처리하지 못했습니다."
          description={error}
          closable
          onClose={() => setError(null)}
        />
      )}

      <div className={styles.tableCard}>
        {loading && comments.length === 0 ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 'var(--orot-space-10)',
            }}
          >
            <Spin size="lg" />
          </div>
        ) : comments.length === 0 ? (
          <Empty description="조건에 맞는 댓글이 없습니다." />
        ) : (
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
        )}
      </div>
    </div>
  );
}
