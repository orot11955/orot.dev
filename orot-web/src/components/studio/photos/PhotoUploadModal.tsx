'use client';

import { Alert, Button, Modal } from 'orot-ui';
import { PhotoMetadataFields } from './PhotoMetadataFields';
import type { PhotoFormState } from './photo-form';
import styles from './PhotosManagement.module.css';

interface PhotoUploadModalProps {
  open: boolean;
  uploadFiles: Array<{
    file: File;
    previewUrl: string;
  }>;
  form: PhotoFormState;
  error: string | null;
  busy: boolean;
  onFileChange: (files: File[]) => void;
  onRemoveFile: (previewUrl: string) => void;
  onFormChange: (patch: Partial<PhotoFormState>) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}

export function PhotoUploadModal({
  open,
  uploadFiles,
  form,
  error,
  busy,
  onFileChange,
  onRemoveFile,
  onFormChange,
  onClose,
  onSubmit,
}: PhotoUploadModalProps) {
  const isBatchUpload = uploadFiles.length > 1;
  const totalSizeMb = uploadFiles.reduce(
    (sum, item) => sum + item.file.size,
    0,
  ) / 1024 / 1024;

  return (
    <Modal
      open={open}
      title="사진 업로드"
      closable={!busy}
      maskClosable={!busy}
      keyboard={!busy}
      onCancel={() => {
        if (busy) {
          return;
        }

        onClose();
      }}
      destroyOnHidden
      footer={(
        <div className={styles.detailFooter}>
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            onClick={() => {
              void onSubmit();
            }}
            loading={busy}
            disabled={uploadFiles.length === 0}
          >
            {isBatchUpload ? `${uploadFiles.length}장 업로드` : '업로드'}
          </Button>
        </div>
      )}
    >
      <div className={styles.uploadForm}>
        <div
          className={`${styles.uploadDrop}${uploadFiles.length > 0 ? ` ${styles.uploadDropActive}` : ''}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className={styles.uploadDropInput}
            onChange={(event) => {
              onFileChange(Array.from(event.target.files ?? []));
            }}
          />
          {uploadFiles.length > 0 ? (
            <span>
              {isBatchUpload
                ? `${uploadFiles.length}개 파일 선택됨 · 총 ${totalSizeMb.toFixed(2)} MB`
                : `${uploadFiles[0].file.name} · ${(uploadFiles[0].file.size / 1024 / 1024).toFixed(2)} MB`}
            </span>
          ) : (
            <span>클릭하거나 파일을 끌어다 놓으세요 (JPG·PNG·WEBP·GIF, 각 50MB 이하, 최대 20장)</span>
          )}
        </div>

        {uploadFiles.length > 0 && (
          <div className={styles.uploadPreviewList}>
            {uploadFiles.map((item, index) => (
              <div
                key={`${item.file.name}-${item.file.size}-${index}`}
                className={styles.uploadPreviewCard}
              >
                <div className={styles.uploadPreview}>
                  <button
                    type="button"
                    className={styles.uploadPreviewRemove}
                    onClick={() => onRemoveFile(item.previewUrl)}
                    disabled={busy}
                    aria-label={`${item.file.name} 제거`}
                  >
                    x
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className={styles.uploadPreviewImage}
                  />
                </div>
                <div className={styles.uploadPreviewMeta}>
                  <span className={styles.uploadPreviewName}>{item.file.name}</span>
                  <span>{`${(item.file.size / 1024 / 1024).toFixed(2)} MB`}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isBatchUpload && (
          <div className={styles.uploadHint}>
            제목은 각 파일명으로 자동 입력되고, 정렬 순서는 입력한 값부터 사진마다 1씩 증가합니다.
          </div>
        )}

        <PhotoMetadataFields
          form={form}
          idPrefix="upload"
          showTitle={!isBatchUpload}
          takenAtHint={
            isBatchUpload
              ? '비워두면 각 이미지 메타데이터의 촬영일을 자동으로 사용합니다.'
              : '비워두면 이미지 메타데이터의 촬영일을 자동으로 사용합니다.'
          }
          sortOrderHint={
            isBatchUpload
              ? '여러 장 업로드 시 입력한 값부터 순서대로 적용됩니다.'
              : undefined
          }
          onChange={onFormChange}
        />

        {error && <Alert type="error" message={error} />}
      </div>
    </Modal>
  );
}
