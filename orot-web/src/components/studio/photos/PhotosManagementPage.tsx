'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Typography,
} from 'orot-ui';
import { useNotificationEffect } from '@/hooks';
import { studioGalleryService } from '@/services';
import type { GalleryItem, GalleryQuery } from '@/types';
import { formatDate, getErrorMessage, resolveAssetUrl } from '@/utils/content';
import styles from './PhotosManagement.module.css';

const PAGE_SIZE = 24;

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'published', label: '공개' },
  { value: 'unpublished', label: '비공개' },
];

type FilterValue = 'all' | 'published' | 'unpublished';

interface DetailFormState {
  title: string;
  description: string;
  altText: string;
  takenAt: string;
  sortOrder: string;
}

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildFormState(item: GalleryItem | null): DetailFormState {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    altText: item?.altText ?? '',
    takenAt: toDateInputValue(item?.takenAt),
    sortOrder: item?.sortOrder != null ? String(item.sortOrder) : '0',
  };
}

export function PhotosManagementPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<GalleryItem | null>(null);
  const [detailForm, setDetailForm] = useState<DetailFormState>(buildFormState(null));
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploadForm, setUploadForm] = useState<DetailFormState>(buildFormState(null));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const reloadTokenRef = useRef(0);

  useNotificationEffect(error, {
    type: 'error',
    title: '요청을 처리하지 못했습니다.',
  });

  const load = useCallback(async () => {
    const token = ++reloadTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const query: GalleryQuery = { page, limit: PAGE_SIZE };
      if (filter === 'published') query.isPublished = true;
      if (filter === 'unpublished') query.isPublished = false;
      if (search) query.search = search;

      const result = await studioGalleryService.getAll(query);
      if (token !== reloadTokenRef.current) return;
      setItems(result.data);
      setTotal(result.total);
    } catch (err) {
      if (token !== reloadTokenRef.current) return;
      setError(getErrorMessage(err));
    } finally {
      if (token === reloadTokenRef.current) setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!uploadPreview) return;
    return () => URL.revokeObjectURL(uploadPreview);
  }, [uploadPreview]);

  const submitSearch = useCallback(() => {
    setSearch(pendingSearch.trim());
    setPage(1);
  }, [pendingSearch]);

  const resetSearch = useCallback(() => {
    setPendingSearch('');
    setSearch('');
    setPage(1);
  }, []);

  const openDetail = useCallback((item: GalleryItem) => {
    setDetail(item);
    setDetailForm(buildFormState(item));
    setDetailError(null);
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
    setDetailForm(buildFormState(null));
    setDetailError(null);
  }, []);

  const handleDetailSave = useCallback(async () => {
    if (!detail) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      const parsedSortOrder = Number.parseInt(detailForm.sortOrder, 10);
      await studioGalleryService.update(detail.id, {
        title: detailForm.title || undefined,
        description: detailForm.description || undefined,
        altText: detailForm.altText || undefined,
        takenAt: detailForm.takenAt
          ? new Date(detailForm.takenAt).toISOString()
          : undefined,
        sortOrder: Number.isNaN(parsedSortOrder) ? undefined : parsedSortOrder,
      });
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
        const updated = await studioGalleryService.togglePublish(item.id);
        if (detail?.id === item.id) setDetail(updated);
        await load();
      } catch (err) {
        setDetailError(getErrorMessage(err));
      } finally {
        setDetailBusy(false);
      }
    },
    [detail, load],
  );

  const handleDelete = useCallback(
    async (item: GalleryItem) => {
      setDetailBusy(true);
      setDetailError(null);
      try {
        await studioGalleryService.remove(item.id);
        closeDetail();
        await load();
      } catch (err) {
        setDetailError(getErrorMessage(err));
      } finally {
        setDetailBusy(false);
      }
    },
    [closeDetail, load],
  );

  const openUpload = useCallback(() => {
    setUploadOpen(true);
    setUploadFile(null);
    setUploadPreview('');
    setUploadForm(buildFormState(null));
    setUploadError(null);
  }, []);

  const closeUpload = useCallback(() => {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadPreview('');
    setUploadForm(buildFormState(null));
    setUploadError(null);
  }, []);

  const handleUploadFileChange = useCallback(
    (file: File | null) => {
      if (!file) return;
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
      const parsedSortOrder = Number.parseInt(uploadForm.sortOrder, 10);
      await studioGalleryService.upload(uploadFile, {
        title: uploadForm.title || undefined,
        description: uploadForm.description || undefined,
        altText: uploadForm.altText || undefined,
        takenAt: uploadForm.takenAt
          ? new Date(uploadForm.takenAt).toISOString()
          : undefined,
        sortOrder: Number.isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
      });
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
      <header className={styles.header}>
        <div className={styles.headerText}>
          <Typography.Text className={styles.eyebrow}>Photos</Typography.Text>
          <Typography.Title level={2} className={styles.title}>
            사진 관리
          </Typography.Title>
          <Typography.Paragraph className={styles.subtitle}>
            업로드된 사진을 한눈에 보고, 선택한 사진만 공개 갤러리에 노출합니다.
          </Typography.Paragraph>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerCount}>
            <span className={styles.headerCountValue}>
              {total.toLocaleString('ko-KR')}
            </span>
            <span>{`이 페이지 공개 ${publishedCount}`}</span>
          </div>
          <Button size="md" variant="solid" onClick={openUpload}>
            사진 업로드
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <Select
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(value) => {
            setFilter((value as FilterValue) ?? 'all');
            setPage(1);
          }}
        />
        <Input
          value={pendingSearch}
          placeholder="제목·설명·대체 텍스트 검색"
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

      <div className={styles.gridCard}>
        {loading && items.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--orot-space-10)' }}>
            <Spin size="lg" />
          </div>
        ) : error && items.length === 0 ? (
          <Empty description={error} />
        ) : items.length === 0 ? (
          <Empty description="조건에 맞는 사진이 없습니다." />
        ) : (
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
        )}
      </div>

      <Modal
        open={Boolean(detail)}
        title={detail?.title ?? '사진 상세'}
        width={900}
        onCancel={closeDetail}
        destroyOnHidden
        footer={null}
      >
        {detail && (
          <div className={styles.detail}>
            <div className={styles.detailPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAssetUrl(detail.imageUrl)}
                alt={detail.altText ?? detail.title ?? ''}
                className={styles.detailImage}
              />
            </div>
            <div className={styles.detailForm}>
              <div className={styles.detailPublish}>
                <div className={styles.detailPublishText}>
                  <span className={styles.detailPublishTitle}>공개 갤러리 노출</span>
                  <span className={styles.detailPublishHint}>
                    켜진 사진만 공개 영역 Masonry에 표시됩니다.
                  </span>
                </div>
                <Switch
                  checked={detail.isPublished}
                  disabled={detailBusy}
                  onChange={() => handleTogglePublish(detail)}
                />
              </div>

              <div className={styles.detailRow}>
                <label className={styles.detailLabel} htmlFor="photo-title">
                  제목
                </label>
                <Input
                  id="photo-title"
                  value={detailForm.title}
                  onChange={(event) =>
                    setDetailForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </div>

              <div className={styles.detailRow}>
                <label className={styles.detailLabel} htmlFor="photo-description">
                  설명
                </label>
                <textarea
                  id="photo-description"
                  className={styles.nativeTextarea}
                  value={detailForm.description}
                  onChange={(event) =>
                    setDetailForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.detailRow}>
                <label className={styles.detailLabel} htmlFor="photo-alt">
                  대체 텍스트
                </label>
                <Input
                  id="photo-alt"
                  value={detailForm.altText}
                  onChange={(event) =>
                    setDetailForm((prev) => ({ ...prev, altText: event.target.value }))
                  }
                />
              </div>

              <div className={styles.detailRow}>
                <label className={styles.detailLabel} htmlFor="photo-taken">
                  촬영일
                </label>
                <input
                  id="photo-taken"
                  type="date"
                  className={styles.nativeInput}
                  value={detailForm.takenAt}
                  onChange={(event) =>
                    setDetailForm((prev) => ({
                      ...prev,
                      takenAt: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.detailRow}>
                <label className={styles.detailLabel} htmlFor="photo-order">
                  정렬 순서
                </label>
                <input
                  id="photo-order"
                  type="number"
                  className={styles.nativeInput}
                  value={detailForm.sortOrder}
                  onChange={(event) =>
                    setDetailForm((prev) => ({
                      ...prev,
                      sortOrder: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.detailMetaList}>
                <span>{`원본: ${detail.width ?? '?'} × ${detail.height ?? '?'}`}</span>
                <span>{`등록: ${formatDate(detail.createdAt)}`}</span>
                <span>{`수정: ${formatDate(detail.updatedAt)}`}</span>
              </div>

              {detailError && (
                <Alert type="error" message={detailError} />
              )}

              <div className={styles.detailFooter}>
                <Popconfirm
                  title="사진을 삭제할까요?"
                  description="삭제된 사진은 복구할 수 없습니다."
                  okText="삭제"
                  cancelText="취소"
                  onConfirm={() => handleDelete(detail)}
                >
                  <Button size="md" variant="text" disabled={detailBusy}>
                    삭제
                  </Button>
                </Popconfirm>
                <div style={{ display: 'flex', gap: 'var(--orot-space-2)' }}>
                  <Button size="md" variant="outlined" onClick={closeDetail} disabled={detailBusy}>
                    닫기
                  </Button>
                  <Button
                    size="md"
                    variant="solid"
                    onClick={handleDetailSave}
                    disabled={detailBusy}
                  >
                    저장
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={uploadOpen}
        title="사진 업로드"
        closable={!uploadBusy}
        maskClosable={!uploadBusy}
        keyboard={!uploadBusy}
        onCancel={() => {
          if (uploadBusy) {
            return;
          }

          closeUpload();
        }}
        destroyOnHidden
        footer={(
          <div className={styles.detailFooter}>
            <Button
              variant="outlined"
              onClick={closeUpload}
              disabled={uploadBusy}
            >
              취소
            </Button>
            <Button
              onClick={() => {
                void handleUploadSubmit();
              }}
              loading={uploadBusy}
              disabled={!uploadFile}
            >
              업로드
            </Button>
          </div>
        )}
      >
        <div className={styles.uploadForm}>
          <div
            className={`${styles.uploadDrop}${uploadFile ? ` ${styles.uploadDropActive}` : ''}`}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.uploadDropInput}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                handleUploadFileChange(file);
              }}
            />
            {uploadFile ? (
              <span>{`${uploadFile.name} · ${(uploadFile.size / 1024 / 1024).toFixed(2)} MB`}</span>
            ) : (
              <span>클릭하거나 파일을 끌어다 놓으세요 (JPG·PNG·WEBP·GIF, 20MB 이하)</span>
            )}
          </div>

          {uploadPreview && (
            <div className={styles.uploadPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadPreview}
                alt="업로드 미리보기"
                className={styles.uploadPreviewImage}
              />
            </div>
          )}

          <div className={styles.detailRow}>
            <label className={styles.detailLabel} htmlFor="upload-title">
              제목
            </label>
            <Input
              id="upload-title"
              value={uploadForm.title}
              onChange={(event) =>
                setUploadForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>

          <div className={styles.detailRow}>
            <label className={styles.detailLabel} htmlFor="upload-description">
              설명
            </label>
            <textarea
              id="upload-description"
              className={styles.nativeTextarea}
              value={uploadForm.description}
              onChange={(event) =>
                setUploadForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <div className={styles.detailRow}>
            <label className={styles.detailLabel} htmlFor="upload-alt">
              대체 텍스트
            </label>
            <Input
              id="upload-alt"
              value={uploadForm.altText}
              onChange={(event) =>
                setUploadForm((prev) => ({ ...prev, altText: event.target.value }))
              }
            />
          </div>

          <div className={styles.detailRow}>
            <label className={styles.detailLabel} htmlFor="upload-taken">
              촬영일
            </label>
            <input
              id="upload-taken"
              type="date"
              className={styles.nativeInput}
              value={uploadForm.takenAt}
              onChange={(event) =>
                setUploadForm((prev) => ({
                  ...prev,
                  takenAt: event.target.value,
                }))
              }
            />
          </div>

          <div className={styles.detailRow}>
            <label className={styles.detailLabel} htmlFor="upload-order">
              정렬 순서
            </label>
            <input
              id="upload-order"
              type="number"
              className={styles.nativeInput}
              value={uploadForm.sortOrder}
              onChange={(event) =>
                setUploadForm((prev) => ({
                  ...prev,
                  sortOrder: event.target.value,
                }))
              }
            />
          </div>

          {uploadError && <Alert type="error" message={uploadError} />}
        </div>
      </Modal>
    </div>
  );
}
