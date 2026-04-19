'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Spin,
  Table,
  Typography,
} from 'orot-ui';
import type { ColumnType } from 'orot-ui';
import { useNotificationEffect } from '@/hooks';
import { studioPostsService, studioSeriesService } from '@/services';
import type {
  CreateSeriesPayload,
  PostListItem,
  Series,
  SeriesPostSummary,
} from '@/types';
import { formatDate, getErrorMessage, resolveAssetUrl } from '@/utils/content';
import styles from './SeriesManagement.module.css';

type SeriesRow = Omit<Series, never>;

type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; series: Series };

interface FormState {
  title: string;
  slug: string;
  description: string;
}

const MAX_POST_PAGE_SIZE = 100;

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  description: '',
};

function toFormState(series: Series): FormState {
  return {
    title: series.title,
    slug: series.slug,
    description: series.description ?? '',
  };
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSearch, setPendingSearch] = useState('');
  const [search, setSearch] = useState('');

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
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
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useNotificationEffect(error, {
    type: 'error',
    title: '요청을 처리하지 못했습니다.',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await studioSeriesService.getAll();
      setSeriesList(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

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

  const submitSearch = useCallback(() => {
    setSearch(pendingSearch.trim());
  }, [pendingSearch]);

  const resetSearch = useCallback(() => {
    setPendingSearch('');
    setSearch('');
  }, []);

  const openCreate = useCallback(() => {
    setEditor({ mode: 'create' });
    setFormState(EMPTY_FORM);
    setCoverImage('');
    setCoverFile(null);
    setCoverPreviewUrl('');
    setCoverRemoved(false);
    setFormError(null);
  }, []);

  const openEdit = useCallback((series: Series) => {
    setEditor({ mode: 'edit', series });
    setFormState(toFormState(series));
    setCoverImage(series.coverImage ?? '');
    setCoverFile(null);
    setCoverPreviewUrl('');
    setCoverRemoved(false);
    setFormError(null);
  }, []);

  const closeEditor = useCallback(() => {
    setEditor(null);
    setFormState(EMPTY_FORM);
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
  ]);

  const handleDelete = useCallback(
    async (series: Series) => {
      setMutatingId(series.id);
      try {
        await studioSeriesService.remove(series.id);
        await load();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setMutatingId(null);
      }
    },
    [load],
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
          return (
            <div className={styles.actions}>
              <Button
                size="sm"
                variant="solid"
                disabled={busy}
                onClick={() => openAssign(series)}
              >
                글 관리
              </Button>
              <Button
                size="sm"
                variant="outlined"
                disabled={busy}
                onClick={() => openEdit(series)}
              >
                수정
              </Button>
              <Popconfirm
                title="시리즈를 삭제하시겠습니까?"
                description="연결된 글은 시리즈에서만 해제되며 삭제되지 않습니다."
                okText="삭제"
                cancelText="취소"
                onConfirm={() => handleDelete(series)}
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
    [handleDelete, mutatingId, openAssign, openEdit],
  );

  const coverPreview = coverPreviewUrl || resolveAssetUrl(coverImage);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <Typography.Text className={styles.eyebrow}>Series</Typography.Text>
          <Typography.Title level={2} className={styles.title}>
            시리즈 관리
          </Typography.Title>
          <Typography.Paragraph className={styles.subtitle}>
            발행(PUBLISHED)된 글을 묶어 시리즈를 구성하고 순서를 조정합니다. 시리즈는 공개 영역의 앞·뒤 글 네비게이션으로 노출됩니다.
          </Typography.Paragraph>
        </div>
        <div className={styles.headerActions}>
          <Badge count={seriesList.length} showZero color="var(--public-accent)" />
          <span>{`총 ${seriesList.length.toLocaleString('ko-KR')}개`}</span>
          <Button size="md" variant="solid" onClick={openCreate}>
            새 시리즈
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <Input
          value={pendingSearch}
          placeholder="제목·슬러그·설명 검색"
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

      <div className={styles.tableCard}>
        {loading && seriesList.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--orot-space-10)' }}>
            <Spin size="lg" />
          </div>
        ) : error && seriesList.length === 0 ? (
          <Empty description={error} />
        ) : filtered.length === 0 ? (
          <Empty description="조건에 맞는 시리즈가 없습니다." />
        ) : (
          <Table<SeriesRow>
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            size="md"
          />
        )}
      </div>

      <Modal
        open={editor !== null}
        title={editor?.mode === 'edit' ? '시리즈 수정' : '새 시리즈'}
        okText={editor?.mode === 'edit' ? '저장' : '생성'}
        cancelText="취소"
        confirmLoading={saving}
        onOk={submitEditor}
        onCancel={closeEditor}
        destroyOnHidden
        width={640}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label} htmlFor="series-title">제목 *</label>
            <Input
              id="series-title"
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="series-slug">슬러그</label>
            <Input
              id="series-slug"
              value={formState.slug}
              placeholder="비워두면 제목으로 자동 생성"
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, slug: event.target.value }))
              }
            />
            <span className={styles.helper}>공개 URL에 사용됩니다. /series/&lt;slug&gt;</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>커버 이미지</span>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.hiddenInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                handleCoverFileChange(file);
                event.currentTarget.value = '';
              }}
            />
            <div className={styles.coverCard}>
              <div className={styles.coverPreview}>
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview}
                    alt="시리즈 커버 미리보기"
                    className={styles.coverPreviewImage}
                  />
                ) : (
                  <div className={styles.coverPlaceholder}>커버 이미지 없음</div>
                )}
              </div>
              <div className={styles.coverMeta}>
                <div className={styles.coverActions}>
                  <Button
                    size="sm"
                    variant="outlined"
                    disabled={saving}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {coverPreview ? '이미지 교체' : '이미지 선택'}
                  </Button>
                  <Button
                    size="sm"
                    variant="text"
                    disabled={saving || (!coverPreview && !coverFile)}
                    onClick={clearCoverSelection}
                  >
                    이미지 제거
                  </Button>
                </div>
                <span className={styles.helper}>
                  JPG, PNG, WEBP, GIF 파일을 업로드할 수 있습니다. 저장 버튼을 누르면 반영됩니다.
                </span>
                {coverFile && (
                  <span className={styles.fileMeta}>
                    {`${coverFile.name} · ${(coverFile.size / 1024 / 1024).toFixed(2)} MB`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label} htmlFor="series-desc">설명</label>
            <textarea
              id="series-desc"
              className={styles.textarea}
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          {formError && <Alert type="error" message={formError} />}
        </div>
      </Modal>

      <Modal
        open={assignTarget !== null}
        title={assignTarget ? `글 관리 · ${assignTarget.title}` : '글 관리'}
        okText="저장"
        cancelText="취소"
        confirmLoading={assignLoading}
        onOk={saveAssignment}
        onCancel={closeAssign}
        destroyOnHidden
        width={880}
      >
        {assignError && (
          <Alert
            type="error"
            message={assignError}
            closable
            onClose={() => setAssignError(null)}
            style={{ marginBottom: 'var(--orot-space-3)' }}
          />
        )}
        {assignLoading && assignPool.length === 0 && assignOrder.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--orot-space-10)' }}>
            <Spin size="lg" />
          </div>
        ) : (
          <div className={styles.assignLayout}>
            <div className={styles.assignColumn}>
              <div className={styles.assignHeader}>
                <span>발행된 글</span>
                <span className={styles.assignCount}>{availablePosts.length}편</span>
              </div>
              <Input
                value={assignSearch}
                placeholder="제목·슬러그 검색"
                onChange={(event) => setAssignSearch(event.target.value)}
              />
              {availablePosts.length === 0 ? (
                <div className={styles.emptyList}>추가할 수 있는 발행된 글이 없습니다.</div>
              ) : (
                <ul className={styles.assignList}>
                  {availablePosts.map((post) => (
                    <li key={post.id} className={styles.assignItem}>
                      <div className={styles.assignItemBody}>
                        <span className={styles.assignItemTitle}>{post.title}</span>
                        <span className={styles.assignItemMeta}>
                          {post.slug} · {formatDate(post.publishedAt)}
                        </span>
                      </div>
                      <div className={styles.assignItemActions}>
                        <Button
                          size="sm"
                          variant="text"
                          onClick={() => addPostToSeries(post)}
                        >
                          추가
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.assignColumn}>
              <div className={styles.assignHeader}>
                <span>시리즈에 포함 (위에서 아래 순서)</span>
                <span className={styles.assignCount}>{assignOrder.length}편</span>
              </div>
              {assignOrder.length === 0 ? (
                <div className={styles.emptyList}>왼쪽에서 글을 추가하세요.</div>
              ) : (
                <ul className={styles.assignList}>
                  {assignOrder.map((post, index) => (
                    <li key={post.id} className={styles.assignItem}>
                      <span className={styles.orderBadge}>{index + 1}</span>
                      <div className={styles.assignItemBody}>
                        <span className={styles.assignItemTitle}>{post.title}</span>
                        <span className={styles.assignItemMeta}>{post.slug}</span>
                      </div>
                      <div className={styles.assignItemActions}>
                        <Button
                          size="sm"
                          variant="text"
                          disabled={index === 0}
                          onClick={() => movePost(post.id, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="text"
                          disabled={index === assignOrder.length - 1}
                          onClick={() => movePost(post.id, 1)}
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="text"
                          onClick={() => removePostFromSeries(post.id)}
                        >
                          제거
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
