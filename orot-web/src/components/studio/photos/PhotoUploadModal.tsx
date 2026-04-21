'use client';

import { Alert, Button, Modal } from 'orot-ui';
import { PhotoMetadataFields } from './PhotoMetadataFields';
import type { PhotoFormState } from './photo-form';
import styles from './PhotosManagement.module.css';

interface PhotoUploadModalProps {
  open: boolean;
  uploadFile: File | null;
  uploadPreview: string;
  form: PhotoFormState;
  error: string | null;
  busy: boolean;
  onFileChange: (file: File | null) => void;
  onFormChange: (patch: Partial<PhotoFormState>) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}

export function PhotoUploadModal({
  open,
  uploadFile,
  uploadPreview,
  form,
  error,
  busy,
  onFileChange,
  onFormChange,
  onClose,
  onSubmit,
}: PhotoUploadModalProps) {
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
              onFileChange(file);
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

        <PhotoMetadataFields
          form={form}
          idPrefix="upload"
          takenAtHint="비워두면 이미지 메타데이터의 촬영일을 자동으로 사용합니다."
          onChange={onFormChange}
        />

        {error && <Alert type="error" message={error} />}
      </div>
    </Modal>
  );
}
