'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Table,
} from 'orot-ui';
import type { ColumnType } from 'orot-ui';
import {
  useLatestAsyncState,
  useManagementSearch,
  useNotificationEffect,
} from '@/hooks';
import { studioPostsService, studioSeriesService } from '@/services';
import type {
  CreateSeriesPayload,
  PostListItem,
  Series,
  SeriesPostSummary,
} from '@/types';
import {
  ManagementActionGroup,
  type ManagementActionItem,
} from '@/components/studio/shared/actions/ManagementActionGroup';
import { ManagementContentState } from '@/components/studio/shared/management/ManagementContentState';
import { ManagementPageHeader } from '@/components/studio/shared/management/ManagementPageHeader';
import { ManagementToolbar } from '@/components/studio/shared/management/ManagementToolbar';
import { formatDate, getErrorMessage, resolveAssetUrl } from '@/utils/content';
import { SeriesAssignmentModal } from './SeriesAssignmentModal';
import { SeriesEditorModal } from './SeriesEditorModal';
import {
  createSeriesFormState,
  type SeriesEditorState,
  type SeriesFormState,
  toSeriesFormState,
} from './series-form';
import styles from './SeriesManagement.module.css';

type SeriesRow = Omit<Series, never>;

const MAX_POST_PAGE_SIZE = 100;

function filterSeries(list: Series[], keyword: string): Series[] {
  if (!keyword) return list;
  const lowered = keyword.toLowerCase();
  return list.filter((series) => {
    const haystack = [
      series.title,
      series.slug,
      series.description ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(lowered);
  });
}

async function getAllPublishedPosts(): Promise<PostListItem[]> {
  const firstPage = await studioPostsService.getAll({
    status: 'PUBLISHED',
    page: 1,
    limit: MAX_POST_PAGE_SIZE,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      studioPostsService.getAll({
        status: 'PUBLISHED',
        page: index + 2,
        limit: MAX_POST_PAGE_SIZE,
      }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

export function SeriesManagementPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  const [editor, setEditor] = useState<SeriesEditorState | null>(null);
  const [formState, setFormState] = useState<SeriesFormState>(createSeriesFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [coverRemoved, setCoverRemoved] = useState(false);

  const [assignTarget, setAssignTarget] = useState<Series | null>(null);
  const [assignPool, setAssignPool] = useState<PostListItem[]>([]);
  const [assignOrder, setAssignOrder] = useState<SeriesPostSummary[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const {
    loading,
    error,
    setError,
    runLatest,
    runAction,
  } = useLatestAsyncState();
  const {
    search,
    pendingSearch,
    setPendingSearch,
    submitSearch,
    resetSearch,
  } = useManagementSearch();

  useNotificationEffect(error, {
    type: 'error',
    title: '요청을 처리하지 못했습니다.',
  });

  const load = useCallback(async () => {
    const result = await runLatest(() => studioSeriesService.getAll());
    if (!result) {
      return;
    }
    setSeriesList(result);
  }, [runLatest]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!coverPreviewUrl.startsWith('blob:')) {
      return;
    }

    return () => {
      URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  const filtered = useMemo(
    () => filterSeries(seriesList, search),
    [seriesList, search],
  );

  const openCreate = useCallback(() => {
    setEditor({ mode: 'create' });
    setFormState(createSeriesFormState());
    setCoverImage('');
    setCoverFile(null);
    setCoverPreviewUrl('');
    setCoverRemoved(false);
    setFormError(null);
  }, []);

  const openEdit = useCallback((series: Series) => {
    setEditor({ mode: 'edit', series });
    setFormState(toSeriesFormState(series));
    setCoverImage(series.coverImage ?? '');
    setCoverFile(null);
    setCoverPreviewUrl('');
    setCoverRemoved(false);
    setFormError(null);
  }, []);

  const closeEditor = useCallback(() => {
    setEditor(null);
    setFormState(createSeriesFormState());
    setCoverImage('');
    setCoverFile(null);
    setCoverPreviewUrl('');
    setCoverRemoved(false);
    setFormError(null);
    setSaving(false);
  }, []);

  const handleCoverFileChange = useCallback((file: File | null) => {
    if (!file) {
      return;
    }

    setFormError(null);
    setCoverRemoved(false);
    setCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }

      return URL.createObjectURL(file);
    });
  }, []);

  const clearCoverSelection = useCallback(() => {
    setFormError(null);
    setCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }

      return '';
    });
    setCoverRemoved(Boolean(editor?.mode === 'edit' && (coverImage || editor.series.coverImage)));
    setCoverImage('');
  }, [coverImage, editor]);

  const submitEditor = useCallback(async () => {
    if (!editor) return;
    const title = formState.title.trim();
    if (!title) {
      setFormError('제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: CreateSeriesPayload = {
        title,
        slug: formState.slug.trim() || undefined,
        description: formState.description.trim() || undefined,
      };

      const persistCoverChange = async (id: number) => {
        if (coverFile) {
          await studioSeriesService.uploadCoverImage(id, coverFile);
          return;
        }

        if (coverRemoved) {
          await studioSeriesService.removeCoverImage(id);
        }
      };

      if (editor.mode === 'create') {
        const created = await studioSeriesService.create(payload);

        try {
          await persistCoverChange(created.id);
        } catch (err) {
          closeEditor();
          await load();
          setError(
            `시리즈는 생성되었지만 커버 이미지를 업로드하지 못했습니다. ${getErrorMessage(err)}`,
          );
          return;
        }
      } else {
        await studioSeriesService.update(editor.series.id, payload);

        try {
          await persistCoverChange(editor.series.id);
        } catch (err) {
          await load();
          setFormError(
            `시리즈 정보는 저장되었지만 커버 이미지를 반영하지 못했습니다. ${getErrorMessage(err)}`,
          );
          return;
        }
      }

      closeEditor();
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [
    editor,
    formState,
    coverFile,
    coverRemoved,
    closeEditor,
    load,
    setError,
  ]);

  const handleDelete = useCallback(
    async (series: Series) => {
      setMutatingId(series.id);
      try {
        const result = await runAction(() => studioSeriesService.remove(series.id));
        if (result === null) return;
        await load();
      } finally {
        setMutatingId(null);
      }
    },
    [load, runAction],
  );

  const openAssign = useCallback(async (series: Series) => {
    setAssignTarget(series);
    setAssignOrder([]);
    setAssignPool([]);
    setAssignSearch('');
    setAssignError(null);
    setAssignLoading(true);
    try {
      const [detail, published] = await Promise.all([
        studioSeriesService.getById(series.id),
        getAllPublishedPosts(),
      ]);
      const ordered = (detail.posts ?? [])
        .filter((p) => p.status === 'PUBLISHED')
        .sort(
          (a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0),
        );
      setAssignOrder(ordered);
      setAssignPool(published);
    } catch (err) {
      setAssignError(getErrorMessage(err));
    } finally {
      setAssignLoading(false);
    }
  }, []);

  const closeAssign = useCallback(() => {
    setAssignTarget(null);
    setAssignOrder([]);
    setAssignPool([]);
    setAssignError(null);
    setAssignSearch('');
  }, []);

  const addPostToSeries = useCallback((post: PostListItem) => {
    setAssignOrder((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      return [
        ...prev,
        {
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          publishedAt: post.publishedAt,
          seriesOrder: prev.length + 1,
        },
      ];
    });
  }, []);

  const removePostFromSeries = useCallback((id: number) => {
    setAssignOrder((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const movePost = useCallback((id: number, direction: -1 | 1) => {
    setAssignOrder((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index < 0) return prev;
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }, []);

  const saveAssignment = useCallback(async () => {
    if (!assignTarget) return;
    setAssignLoading(true);
    setAssignError(null);
    try {
      await studioSeriesService.assignPosts(assignTarget.id, {
        postIds: assignOrder.map((p) => p.id),
      });
      closeAssign();
      await load();
    } catch (err) {
      setAssignError(getErrorMessage(err));
    } finally {
      setAssignLoading(false);
    }
  }, [assignTarget, assignOrder, closeAssign, load]);

  const assignedIds = useMemo(
    () => new Set(assignOrder.map((p) => p.id)),
    [assignOrder],
  );

  const availablePosts = useMemo(() => {
    const keyword = assignSearch.trim().toLowerCase();
    return assignPool.filter((post) => {
      if (assignedIds.has(post.id)) return false;
      if (!keyword) return true;
      return (
        post.title.toLowerCase().includes(keyword) ||
        post.slug.toLowerCase().includes(keyword)
      );
    });
  }, [assignPool, assignedIds, assignSearch]);

  const columns = useMemo<ColumnType<SeriesRow>[]>(
    () => [
      {
        key: 'title',
        title: '시리즈',
        render: (_v, series) => (
          <div className={styles.titleCell}>
            <span className={styles.titleText}>{series.title}</span>
            <span className={styles.slug}>/series/{series.slug}</span>
            {series.description && (
              <span className={styles.description}>{series.description}</span>
            )}
          </div>
        ),
      },
      {
        key: 'postCount',
        title: '글 수',
        width: 100,
        align: 'right',
        render: (_v, series) => (
          <span className={styles.numeric}>
            {(series._count?.posts ?? series.posts?.length ?? 0).toLocaleString('ko-KR')}
          </span>
        ),
      },
      {
        key: 'createdAt',
        title: '생성일',
        width: 140,
        render: (_v, series) => <span>{formatDate(series.createdAt)}</span>,
      },
      {
        key: 'updatedAt',
        title: '수정일',
        width: 140,
        render: (_v, series) => <span>{formatDate(series.updatedAt)}</span>,
      },
      {
        key: 'actions',
        title: '관리',
        width: 280,
        render: (_v, series) => {
          const busy = mutatingId === series.id;
          const actions: ManagementActionItem[] = [
            {
              key: 'assign',
              label: '글 관리',
              variant: 'solid',
              disabled: busy,
              onClick: () => openAssign(series),
            },
            {
              key: 'edit',
              label: '수정',
              variant: 'outlined',
              disabled: busy,
              onClick: () => openEdit(series),
            },
            {
              key: 'delete',
              label: '삭제',
              variant: 'text',
              disabled: busy,
              confirm: {
                title: '시리즈를 삭제하시겠습니까?',
                description: '연결된 글은 시리즈에서만 해제되며 삭제되지 않습니다.',
                okText: '삭제',
                cancelText: '취소',
                onConfirm: () => handleDelete(series),
              },
            },
          ];

          return <ManagementActionGroup className={styles.actions} actions={actions} />;
        },
      },
    ],
    [handleDelete, mutatingId, openAssign, openEdit],
  );

  const coverPreview = coverPreviewUrl || resolveAssetUrl(coverImage);

  return (
    <div className={styles.page}>
      <ManagementPageHeader
        eyebrow="Series"
        title="시리즈 관리"
        description="발행(PUBLISHED)된 글을 묶어 시리즈를 구성하고 순서를 조정합니다. 시리즈는 공개 영역의 앞·뒤 글 네비게이션으로 노출됩니다."
        classNames={{
          header: styles.header,
          headerText: styles.headerText,
          eyebrow: styles.eyebrow,
          title: styles.title,
          subtitle: styles.subtitle,
          side: styles.headerActions,
        }}
        side={
          <>
          <Badge count={seriesList.length} showZero color="var(--public-accent)" />
          <span>{`총 ${seriesList.length.toLocaleString('ko-KR')}개`}</span>
          <Button size="md" variant="solid" onClick={openCreate}>
            새 시리즈
          </Button>
          </>
        }
      />

      <ManagementToolbar
        searchValue={pendingSearch}
        searchPlaceholder="제목·슬러그·설명 검색"
        onSearchChange={setPendingSearch}
        onSearchSubmit={submitSearch}
        onSearchReset={resetSearch}
      />

      <ManagementContentState
        className={styles.tableCard}
        loading={loading}
        error={error}
        hasData={filtered.length > 0}
        emptyDescription="조건에 맞는 시리즈가 없습니다."
      >
          <Table<SeriesRow>
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            size="md"
          />
      </ManagementContentState>

      <SeriesEditorModal
        editor={editor}
        formState={formState}
        formError={formError}
        saving={saving}
        coverPreview={coverPreview}
        coverFile={coverFile}
        onFormChange={(patch) =>
          setFormState((prev) => ({ ...prev, ...patch }))
        }
        onCoverFileChange={handleCoverFileChange}
        onClearCover={clearCoverSelection}
        onSubmit={submitEditor}
        onClose={closeEditor}
      />

      <SeriesAssignmentModal
        assignTarget={assignTarget}
        assignLoading={assignLoading}
        assignError={assignError}
        showInitialLoading={assignLoading && assignPool.length === 0 && assignOrder.length === 0}
        availablePosts={availablePosts}
        assignOrder={assignOrder}
        assignSearch={assignSearch}
        onAssignSearchChange={setAssignSearch}
        onAddPost={addPostToSeries}
        onMovePost={movePost}
        onRemovePost={removePostFromSeries}
        onDismissError={() => setAssignError(null)}
        onSave={saveAssignment}
        onClose={closeAssign}
      />
    </div>
  );
}
