'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Pagination,
  Select,
} from 'orot-ui';
import {
  useLatestAsyncState,
  useManagementSearch,
  useNotificationEffect,
} from '@/hooks';
import { studioGalleryService } from '@/services';
import type { GalleryItem, GalleryQuery } from '@/types';
import { ManagementContentState } from '@/components/studio/shared/management/ManagementContentState';
import { ManagementPageHeader } from '@/components/studio/shared/management/ManagementPageHeader';
import { ManagementToolbar } from '@/components/studio/shared/management/ManagementToolbar';
import { formatDate, getErrorMessage, resolveAssetUrl } from '@/utils/content';
import { PhotoDetailModal } from './PhotoDetailModal';
import { PhotoUploadModal } from './PhotoUploadModal';
import {
  buildPhotoFormState,
  buildPhotoPayload,
  type PhotoFormState,
} from './photo-form';
import styles from './PhotosManagement.module.css';

const PAGE_SIZE = 24;

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'published', label: '공개' },
  { value: 'unpublished', label: '비공개' },
];

type FilterValue = 'all' | 'published' | 'unpublished';

export function PhotosManagementPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterValue>('all');

  const [detail, setDetail] = useState<GalleryItem | null>(null);
  const [detailForm, setDetailForm] = useState<PhotoFormState>(buildPhotoFormState(null));
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploadForm, setUploadForm] = useState<PhotoFormState>(buildPhotoFormState(null));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
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
      const query: GalleryQuery = { page, limit: PAGE_SIZE };
      if (filter === 'published') query.isPublished = true;
      if (filter === 'unpublished') query.isPublished = false;
      if (search) query.search = search;

      return studioGalleryService.getAll(query);
    });

    if (!result) {
      return;
    }

    setItems(result.data);
    setTotal(result.total);
  }, [page, filter, search, runLatest]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!uploadPreview) return;
    return () => URL.revokeObjectURL(uploadPreview);
  }, [uploadPreview]);

  const openDetail = useCallback((item: GalleryItem) => {
    setDetail(item);
    setDetailForm(buildPhotoFormState(item));
    setDetailError(null);
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
    setDetailForm(buildPhotoFormState(null));
    setDetailError(null);
  }, []);

  const handleDetailSave = useCallback(async () => {
    if (!detail) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      await studioGalleryService.update(
        detail.id,
        buildPhotoPayload(detailForm, { clearEmptyTakenAt: true }),
      );
      await load();
      closeDetail();
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setDetailBusy(false);
    }
  }, [detail, detailForm, load, closeDetail]);

  const handleTogglePublish = useCallback(
    async (item: GalleryItem) => {
      setDetailBusy(true);
      setDetailError(null);
      try {
        const updated = await runAction(() =>
          studioGalleryService.togglePublish(item.id),
        );
        if (!updated) return;
        if (detail?.id === item.id) setDetail(updated);
        await load();
      } catch (err) {
        setDetailError(getErrorMessage(err));
      } finally {
        setDetailBusy(false);
      }
    },
    [detail, load, runAction],
  );

  const handleDelete = useCallback(
    async (item: GalleryItem) => {
      setDetailBusy(true);
      setDetailError(null);
      try {
        const result = await runAction(() => studioGalleryService.remove(item.id));
        if (result === null) return;
        closeDetail();
        await load();
      } catch (err) {
        setDetailError(getErrorMessage(err));
      } finally {
        setDetailBusy(false);
      }
    },
    [closeDetail, load, runAction],
  );

  const openUpload = useCallback(() => {
    setUploadOpen(true);
    setUploadFile(null);
    setUploadPreview('');
    setUploadForm(buildPhotoFormState(null));
    setUploadError(null);
  }, []);

  const closeUpload = useCallback(() => {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadPreview('');
    setUploadForm(buildPhotoFormState(null));
    setUploadError(null);
  }, []);

  const handleUploadFileChange = useCallback(
    (file: File | null) => {
      if (!file) {
        setUploadFile(null);
        setUploadPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return '';
        });
        return;
      }

      setUploadFile(file);
      setUploadPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      if (!uploadForm.title) {
        setUploadForm((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^.]+$/, ''),
        }));
      }
    },
    [uploadForm.title],
  );

  const handleUploadSubmit = useCallback(async () => {
    if (!uploadFile) {
      setUploadError('이미지 파일을 선택해주세요.');
      return;
    }
    setUploadBusy(true);
    setUploadError(null);
    try {
      await studioGalleryService.upload(
        uploadFile,
        buildPhotoPayload(uploadForm, { fallbackSortOrder: 0 }),
      );
      closeUpload();
      setPage(1);
      await load();
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploadBusy(false);
    }
  }, [uploadFile, uploadForm, closeUpload, load]);

  const publishedCount = useMemo(
    () => items.filter((item) => item.isPublished).length,
    [items],
  );

  return (
    <div className={styles.page}>
      <ManagementPageHeader
        eyebrow="Photos"
        title="사진 관리"
        description="업로드된 사진을 한눈에 보고, 선택한 사진만 공개 갤러리에 노출합니다."
        classNames={{
          header: styles.header,
          headerText: styles.headerText,
          eyebrow: styles.eyebrow,
          title: styles.title,
          subtitle: styles.subtitle,
          side: styles.headerRight,
        }}
        side={
          <>
          <div className={styles.headerCount}>
            <span className={styles.headerCountValue}>
              {total.toLocaleString('ko-KR')}
            </span>
            <span>{`이 페이지 공개 ${publishedCount}`}</span>
          </div>
          <Button size="md" variant="solid" onClick={openUpload}>
            사진 업로드
          </Button>
          </>
        }
      />

      <ManagementToolbar
        className={styles.toolbar}
        actionsClassName={styles.toolbarActions}
        searchValue={pendingSearch}
        searchPlaceholder="제목·설명·대체 텍스트 검색"
        onSearchChange={setPendingSearch}
        onSearchSubmit={submitSearch}
        onSearchReset={resetSearch}
      >
        <Select
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(value) => {
            setFilter((value as FilterValue) ?? 'all');
            setPage(1);
          }}
        />
      </ManagementToolbar>

      <ManagementContentState
        className={styles.gridCard}
        loading={loading}
        error={error}
        hasData={items.length > 0}
        emptyDescription="조건에 맞는 사진이 없습니다."
      >
          <>
            <div className={styles.grid}>
              {items.map((item) => {
                const thumb = resolveAssetUrl(item.thumbnailUrl ?? item.imageUrl);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.tile}
                    onClick={() => openDetail(item)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt={item.altText ?? item.title ?? ''}
                      className={styles.tileImage}
                      loading="lazy"
                    />
                    <span
                      className={`${styles.tileBadge}${item.isPublished ? '' : ` ${styles.tileBadgeDraft}`}`}
                    >
                      {item.isPublished ? '공개' : '비공개'}
                    </span>
                    <div className={styles.tileOverlay}>
                      <span className={styles.tileTitle}>
                        {item.title ?? '제목 없음'}
                      </span>
                      <span className={styles.tileMeta}>
                        {formatDate(item.takenAt ?? item.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.paginationRow}>
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                hideOnSinglePage
                onChange={(nextPage) => setPage(nextPage)}
              />
            </div>
          </>
      </ManagementContentState>

      <PhotoDetailModal
        detail={detail}
        form={detailForm}
        error={detailError}
        busy={detailBusy}
        onFormChange={(patch) =>
          setDetailForm((prev) => ({ ...prev, ...patch }))
        }
        onTogglePublish={handleTogglePublish}
        onDelete={handleDelete}
        onClose={closeDetail}
        onSave={handleDetailSave}
      />

      <PhotoUploadModal
        open={uploadOpen}
        uploadFile={uploadFile}
        uploadPreview={uploadPreview}
        form={uploadForm}
        error={uploadError}
        busy={uploadBusy}
        onFileChange={handleUploadFileChange}
        onFormChange={(patch) =>
          setUploadForm((prev) => ({ ...prev, ...patch }))
        }
        onClose={closeUpload}
        onSubmit={handleUploadSubmit}
      />
    </div>
  );
}
