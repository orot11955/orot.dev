'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Modal,
  Select,
  Table,
  Tag,
} from 'orot-ui';
import type { ColumnType } from 'orot-ui';
import {
  useLatestAsyncState,
  useManagementSearch,
  useNotificationEffect,
} from '@/hooks';
import { studioCategoriesService, studioPostsService } from '@/services';
import type { Category, PostListItem, PostQuery, PostStatus } from '@/types';
import {
  ManagementActionGroup,
  type ManagementActionItem,
} from '@/components/studio/shared/actions/ManagementActionGroup';
import { ManagementContentState } from '@/components/studio/shared/management/ManagementContentState';
import { ManagementPageHeader } from '@/components/studio/shared/management/ManagementPageHeader';
import { ManagementToolbar } from '@/components/studio/shared/management/ManagementToolbar';
import { formatDate, splitTags } from '@/utils/content';
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

function getPostTitleLink(post: PostListItem) {
  if (post.status === 'UPDATED') {
    return {
      href: `/editor/posts/${post.id}`,
      target: undefined,
      rel: undefined,
    };
  }

  if (post.status === 'REVIEW' || post.status === 'PUBLISHED') {
    return {
      href: `/posts/${post.slug}`,
      target: '_blank',
      rel: 'noopener noreferrer',
    };
  }

  return null;
}

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
  const [categoryId, setCategoryId] = useState<number | 'all'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<PostListItem | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
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

  const resetFilters = useCallback(() => {
    setStatus('all');
    setSort('latest');
    setCategoryId('all');
    resetSearch();
  }, [resetSearch]);

  const load = useCallback(async () => {
    const result = await runLatest(async () => {
      const query: PostQuery = {
        page,
        limit: DEFAULT_LIMIT,
        sort,
      };
      if (status !== 'all') query.status = status;
      if (categoryId !== 'all') query.categoryId = categoryId;
      if (search) query.search = search;

      return studioPostsService.getAll(query);
    });

    if (!result) {
      return;
    }

    setPosts(result.data);
    setTotal(result.total);
  }, [page, sort, status, categoryId, search, runLatest]);

  useEffect(() => {
    let cancelled = false;
    studioCategoriesService
      .getAll()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTransition = useCallback(
    async (
      post: PostListItem,
      target: PostStatus,
      payloadScheduledAt?: string,
    ) => {
      setMutatingId(post.id);
      try {
        const result = await runAction(() =>
          studioPostsService.transition(post.id, {
          status: target,
          ...(payloadScheduledAt ? { scheduledAt: payloadScheduledAt } : {}),
          }),
        );
        if (!result) return;
        await load();
      } finally {
        setMutatingId(null);
      }
    },
    [load, runAction],
  );

  const handleDelete = useCallback(
    async (post: PostListItem) => {
      setMutatingId(post.id);
      try {
        const result = await runAction(() => studioPostsService.remove(post.id));
        if (result === null) return;
        await load();
      } finally {
        setMutatingId(null);
      }
    },
    [load, runAction],
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
          const titleLink = getPostTitleLink(post);
          return (
            <div className={styles.titleCell}>
              {titleLink ? (
                <Link
                  href={titleLink.href}
                  className={styles.titleLink}
                  target={titleLink.target}
                  rel={titleLink.rel}
                >
                  {post.title}
                </Link>
              ) : (
                <span className={styles.titleText}>{post.title}</span>
              )}
              <div className={styles.titleMeta}>
                {post.category ? `[${post.category.name}] ` : ''}
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
        width: 300,
        align: 'left',
        render: (_value, post) => {
          const busy = mutatingId === post.id;
          const canPublish = post.status === 'REVIEW' || post.status === 'SCHEDULED';
          const canSchedule = post.status === 'REVIEW';
          const canArchive = post.status === 'PUBLISHED';
          const canRestart = post.status === 'PUBLISHED';
          const canReview = post.status === 'UPDATED' || post.status === 'ARCHIVED';
          const canCancelSchedule = post.status === 'SCHEDULED';
          const actions: ManagementActionItem[] = [];

          if (canPublish) {
            actions.push({
              key: 'publish',
              label: post.status === 'SCHEDULED' ? '즉시 발행' : '발행',
              variant: 'solid',
              disabled: busy,
              onClick: () => handleTransition(post, 'PUBLISHED'),
            });
          }

          if (canSchedule) {
            actions.push({
              key: 'schedule',
              label: '예약 발행',
              variant: 'outlined',
              disabled: busy,
              onClick: () => openScheduleModal(post),
            });
          }

          if (canCancelSchedule) {
            actions.push({
              key: 'cancel-schedule',
              label: '예약 취소',
              variant: 'outlined',
              disabled: busy,
              onClick: () => handleTransition(post, 'DRAFT'),
            });
          }

          if (canRestart) {
            actions.push({
              key: 'restart',
              label: '수정 시작',
              variant: 'outlined',
              disabled: busy,
              onClick: () => handleTransition(post, 'UPDATED'),
            });
          }

          if (canArchive) {
            actions.push({
              key: 'archive',
              label: '보관',
              variant: 'outlined',
              disabled: busy,
              onClick: () => handleTransition(post, 'ARCHIVED'),
            });
          }

          if (canReview) {
            actions.push({
              key: 'review',
              label: '검토로',
              variant: 'outlined',
              disabled: busy,
              onClick: () => handleTransition(post, 'REVIEW'),
            });
          }

          actions.push({
            key: 'delete',
            label: '삭제',
            variant: 'text',
            disabled: busy,
            confirm: {
              title: '삭제하시겠습니까?',
              description: '삭제된 글은 복구할 수 없습니다.',
              okText: '삭제',
              cancelText: '취소',
              onConfirm: () => handleDelete(post),
            },
          });

          return <ManagementActionGroup className={styles.actions} actions={actions} />;
        },
      },
    ],
    [handleDelete, handleTransition, mutatingId, openScheduleModal],
  );

  return (
    <div className={styles.page}>
      <ManagementPageHeader
        eyebrow="Posts"
        title="글 관리"
        description="스튜디오에 노출되는 글의 발행·예약·보관·삭제를 관리하고, 에디터로 이동해 내용을 수정합니다."
        classNames={{
          header: styles.header,
          headerText: styles.headerText,
          eyebrow: styles.eyebrow,
          title: styles.title,
          subtitle: styles.subtitle,
          side: styles.headerMeta,
        }}
        side={
          <>
            <Badge count={total} showZero color="var(--public-accent)" />
            <span>{`총 ${total.toLocaleString('ko-KR')}편`}</span>
          </>
        }
      />

      <ManagementToolbar
        searchValue={pendingSearch}
        searchPlaceholder="제목·내용·요약 검색"
        onSearchChange={setPendingSearch}
        onSearchSubmit={submitSearch}
        onSearchReset={resetFilters}
      >
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus((value as PostStatus | 'all') ?? 'all');
            setPage(1);
          }}
        />
        <Select
          options={[
            { value: 'all', label: '전체 카테고리' },
            ...categories.map((c) => ({
              value: String(c.id),
              label: c.name,
            })),
          ]}
          value={categoryId === 'all' ? 'all' : String(categoryId)}
          onChange={(value) => {
            const str = String(value ?? 'all');
            setCategoryId(str === 'all' ? 'all' : Number(str));
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
      </ManagementToolbar>

      <ManagementContentState
        className={styles.tableCard}
        loading={loading}
        error={error}
        hasData={posts.length > 0}
        emptyDescription="조건에 맞는 글이 없습니다."
      >
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
      </ManagementContentState>

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
