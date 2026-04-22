'use client';

import { Alert, Button, Modal, Popconfirm, Switch } from 'orot-ui';
import type { GalleryItem } from '@/types';
import { formatDate, resolveAssetUrl } from '@/utils/content';
import { PhotoMetadataFields } from './PhotoMetadataFields';
import type { PhotoFormState } from './photo-form';
import styles from './PhotosManagement.module.css';

interface PhotoDetailModalProps {
  detail: GalleryItem | null;
  form: PhotoFormState;
  error: string | null;
  busy: boolean;
  onFormChange: (patch: Partial<PhotoFormState>) => void;
  onReprocess: (item: GalleryItem) => void | Promise<void>;
  onTogglePublish: (item: GalleryItem) => void | Promise<void>;
  onDelete: (item: GalleryItem) => void | Promise<void>;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}

export function PhotoDetailModal({
  detail,
  form,
  error,
  busy,
  onFormChange,
  onReprocess,
  onTogglePublish,
  onDelete,
  onClose,
  onSave,
}: PhotoDetailModalProps) {
  return (
    <Modal
      open={Boolean(detail)}
      title={detail?.title ?? '사진 상세'}
      width={900}
      onCancel={onClose}
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
                <span className={styles.detailPublishTitle}>
                  공개 갤러리 노출
                </span>
                <span className={styles.detailPublishHint}>
                  켜진 사진만 공개 영역 Masonry에 표시됩니다.
                </span>
              </div>
              <Switch
                checked={detail.isPublished}
                disabled={busy}
                onChange={() => {
                  void onTogglePublish(detail);
                }}
              />
            </div>

            <PhotoMetadataFields
              form={form}
              idPrefix="photo"
              onChange={onFormChange}
            />

            <div className={styles.detailMetaList}>
              <span>{`원본: ${detail.width ?? '?'} × ${detail.height ?? '?'}`}</span>
              <span>{`등록: ${formatDate(detail.createdAt)}`}</span>
              <span>{`수정: ${formatDate(detail.updatedAt)}`}</span>
            </div>

            <div className={styles.detailRepair}>
              <div className={styles.detailRepairText}>
                <span className={styles.detailRepairTitle}>방향 보정</span>
                <span className={styles.detailRepairHint}>
                  세로 사진이 목록에서 가로로 눕는 경우 원본 EXIF 기준으로
                  썸네일과 비율을 다시 맞춥니다.
                </span>
              </div>
              <Button
                size="sm"
                variant="outlined"
                disabled={busy}
                onClick={() => {
                  void onReprocess(detail);
                }}
              >
                방향 보정
              </Button>
            </div>

            {error && <Alert type="error" message={error} />}

            <div className={styles.detailFooter}>
              <Popconfirm
                title="사진을 삭제할까요?"
                description="삭제된 사진은 복구할 수 없습니다."
                okText="삭제"
                cancelText="취소"
                onConfirm={() => {
                  void onDelete(detail);
                }}
              >
                <Button size="md" variant="text" disabled={busy}>
                  삭제
                </Button>
              </Popconfirm>
              <div style={{ display: 'flex', gap: 'var(--orot-space-2)' }}>
                <Button
                  size="md"
                  variant="outlined"
                  onClick={onClose}
                  disabled={busy}
                >
                  닫기
                </Button>
                <Button
                  size="md"
                  variant="solid"
                  onClick={() => {
                    void onSave();
                  }}
                  disabled={busy}
                >
                  저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
