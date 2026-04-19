'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'orot-ui';
import type { ColumnType } from 'orot-ui';
import { studioPostsService } from '@/services';
import type { PostListItem, PostQuery, PostStatus } from '@/types';
import { formatDate, getErrorMessage, splitTags } from '@/utils/content';
import { STATUS_META } from '@/components/studio/dashboard/PostStatusChart';
import styles from './PostsManagement.module.css';

const STUDIO_STATUSES: PostStatus[] = [
  'REVIEW',
  'UPDATED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  ...STUDIO_STATUSES.map((status) => ({
    value: status,
    label: STATUS_META[status].label,
  })),
];

const SORT_OPTIONS = [
  { value: 'latest', label: '최신 순' },
  { value: 'popular', label: '인기 순' },
];

const DEFAULT_LIMIT = 10;

type SortValue = 'latest' | 'popular';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowPlusHour(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d);
}

export function PostsManagementPage() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PostStatus | 'all'>('all');
  const [sort, setSort] = useState<SortValue>('latest');
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<PostListItem | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const reloadTokenRef = useRef(0);

  const load = useCallback(async () => {
    const token = ++reloadTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const query: PostQuery = {
        page,
        limit: DEFAULT_LIMIT,
        sort,
      };
      if (status !== 'all') query.status = status;
      if (search) query.search = search;

      const result = await studioPostsService.getAll(query);
      if (token !== reloadTokenRef.current) return;
      setPosts(result.data);
      setTotal(result.total);
    } catch (err) {
      if (token !== reloadTokenRef.current) return;
      setError(getErrorMessage(err));
    } finally {
      if (token === reloadTokenRef.current) setLoading(false);
    }
  }, [page, sort, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = useCallback(() => {
    setSearch(pendingSearch.trim());
    setPage(1);
  }, [pendingSearch]);

  const resetSearch = useCallback(() => {
    setPendingSearch('');
    setSearch('');
    setPage(1);
  }, []);

  const handleTransition = useCallback(
    async (
      post: PostListItem,
      target: PostStatus,
      payloadScheduledAt?: string,
    ) => {
      setMutatingId(post.id);
      try {
        await studioPostsService.transition(post.id, {
          status: target,
          ...(payloadScheduledAt ? { scheduledAt: payloadScheduledAt } : {}),
        });
        await load();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setMutatingId(null);
      }
    },
    [load],
  );

  const handleDelete = useCallback(
    async (post: PostListItem) => {
      setMutatingId(post.id);
      try {
        await studioPostsService.remove(post.id);
        await load();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setMutatingId(null);
      }
    },
    [load],
  );

  const openScheduleModal = useCallback((post: PostListItem) => {
    setScheduleTarget(post);
    setScheduleError(null);
    setScheduledAt(
      post.scheduledAt ? toLocalInputValue(new Date(post.scheduledAt)) : nowPlusHour(),
    );
  }, []);

  const closeScheduleModal = useCallback(() => {
    setScheduleTarget(null);
    setScheduledAt('');
    setScheduleError(null);
  }, []);

  const confirmSchedule = useCallback(async () => {
    if (!scheduleTarget) return;
    if (!scheduledAt) {
      setScheduleError('예약 일시를 선택해주세요.');
      return;
    }
    const iso = new Date(scheduledAt);
    if (Number.isNaN(iso.getTime()) || iso <= new Date()) {
      setScheduleError('미래 시각을 선택해주세요.');
      return;
    }
    setScheduleError(null);
    const target = scheduleTarget;
    closeScheduleModal();
    await handleTransition(target, 'SCHEDULED', iso.toISOString());
  }, [scheduleTarget, scheduledAt, closeScheduleModal, handleTransition]);

  const columns = useMemo<ColumnType<PostListItem>[]>(
    () => [
      {
        key: 'title',
        title: '글',
        render: (_value, post) => {
          const tags = splitTags(post.tags);
          return (
            <div className={styles.titleCell}>
              <Link href={`/posts/${post.slug}`} className={styles.titleLink} target="_blank">
                {post.title}
              </Link>
              <div className={styles.titleMeta}>
                {post.series ? `${post.series.title} · ` : ''}
                {post.slug}
              </div>
              {tags.length > 0 && (
                <div className={styles.tagList}>
                  {tags.slice(0, 4).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                  {tags.length > 4 && (
                    <span className={styles.muted}>+{tags.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        title: '상태',
        width: 120,
        render: (_value, post) => {
          const meta = STATUS_META[post.status];
          return <Badge status={meta.badge} text={meta.label} />;
        },
      },
      {
        key: 'viewCount',
        title: '조회수',
        width: 100,
        align: 'right',
        render: (_value, post) => (
          <span className={styles.numeric}>
            {post.viewCount.toLocaleString('ko-KR')}
          </span>
        ),
      },
      {
        key: 'publishedAt',
        title: '발행/예약일',
        width: 140,
        render: (_value, post) => {
          if (post.status === 'SCHEDULED') {
            return <span>{formatDate(post.scheduledAt)}</span>;
          }
          return <span>{formatDate(post.publishedAt)}</span>;
        },
      },
      {
        key: 'updatedAt',
        title: '수정일',
        width: 140,
        render: (_value, post) => <span>{formatDate(post.updatedAt)}</span>,
      },
      {
        key: 'actions',
        title: '관리',
        width: 340,
        render: (_value, post) => {
          const busy = mutatingId === post.id;
          const editHref = `/editor/posts/${post.id}`;
          const canPublish = post.status === 'REVIEW' || post.status === 'SCHEDULED';
          const canSchedule = post.status === 'REVIEW';
          const canArchive = post.status === 'PUBLISHED';
          const canRestart = post.status === 'PUBLISHED';
          const canReview = post.status === 'UPDATED' || post.status === 'ARCHIVED';
          const canCancelSchedule = post.status === 'SCHEDULED';

          return (
            <div className={styles.actions}>
              {canPublish && (
                <Button
                  size="sm"
                  variant="solid"
                  disabled={busy}
                  onClick={() => handleTransition(post, 'PUBLISHED')}
                >
                  {post.status === 'SCHEDULED' ? '즉시 발행' : '발행'}
                </Button>
              )}
              {canSchedule && (
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => openScheduleModal(post)}
                >
                  예약 발행
                </Button>
              )}
              {canCancelSchedule && (
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => handleTransition(post, 'DRAFT')}
                >
                  예약 취소
                </Button>
              )}
              {canRestart && (
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => handleTransition(post, 'UPDATED')}
                >
                  수정 시작
                </Button>
              )}
              {canArchive && (
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => handleTransition(post, 'ARCHIVED')}
                >
                  보관
                </Button>
              )}
              {canReview && (
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => handleTransition(post, 'REVIEW')}
                >
                  검토로
                </Button>
              )}
              <Link href={editHref}>
                <Button size="sm" variant="text" disabled={busy}>
                  수정
                </Button>
              </Link>
              <Popconfirm
                title="삭제하시겠습니까?"
                description="삭제된 글은 복구할 수 없습니다."
                okText="삭제"
                cancelText="취소"
                onConfirm={() => handleDelete(post)}
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
    [handleDelete, handleTransition, mutatingId, openScheduleModal],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <Typography.Text className={styles.eyebrow}>Posts</Typography.Text>
          <Typography.Title level={2} className={styles.title}>
            글 관리
          </Typography.Title>
          <Typography.Paragraph className={styles.subtitle}>
            스튜디오에 노출되는 글의 발행·예약·보관·삭제를 관리하고, 에디터로 이동해 내용을 수정합니다.
          </Typography.Paragraph>
        </div>
        <div className={styles.headerMeta}>
          <Badge count={total} showZero color="var(--public-accent)" />
          <span>{`총 ${total.toLocaleString('ko-KR')}편`}</span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus((value as PostStatus | 'all') ?? 'all');
            setPage(1);
          }}
        />
        <Select
          options={SORT_OPTIONS}
          value={sort}
          onChange={(value) => {
            setSort((value as SortValue) ?? 'latest');
            setPage(1);
          }}
        />
        <Input
          value={pendingSearch}
          placeholder="제목·내용·요약 검색"
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
        {loading && posts.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--orot-space-10)' }}>
            <Spin size="lg" />
          </div>
        ) : posts.length === 0 ? (
          <Empty description="조건에 맞는 글이 없습니다." />
        ) : (
          <Table<PostListItem>
            columns={columns}
            dataSource={posts}
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

      <Modal
        open={Boolean(scheduleTarget)}
        title="예약 발행"
        okText="예약"
        cancelText="취소"
        onOk={confirmSchedule}
        onCancel={closeScheduleModal}
        destroyOnHidden
      >
        <div className={styles.scheduleField}>
          <label htmlFor="scheduled-at" className={styles.scheduleLabel}>
            {scheduleTarget?.title}
          </label>
          <input
            id="scheduled-at"
            type="datetime-local"
            className={styles.scheduleInput}
            value={scheduledAt}
            min={toLocalInputValue(new Date())}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <span className={styles.scheduleHelper}>
            선택한 시각이 지나면 자동 발행됩니다. 미래 시각만 지정할 수 있습니다.
          </span>
          {scheduleError && (
            <Alert type="error" message={scheduleError} />
          )}
        </div>
      </Modal>
    </div>
  );
}
