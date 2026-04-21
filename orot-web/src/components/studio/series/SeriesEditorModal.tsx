'use client';

import { Alert, Input, Modal } from 'orot-ui';
import { ImageSelectionCard } from '@/components/studio/shared/media/ImageSelectionCard';
import type { SeriesEditorState, SeriesFormState } from './series-form';
import styles from './SeriesManagement.module.css';

interface SeriesEditorModalProps {
  editor: SeriesEditorState | null;
  formState: SeriesFormState;
  formError: string | null;
  saving: boolean;
  coverPreview: string;
  coverFile: File | null;
  onFormChange: (patch: Partial<SeriesFormState>) => void;
  onCoverFileChange: (file: File | null) => void;
  onClearCover: () => void;
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
}

export function SeriesEditorModal({
  editor,
  formState,
  formError,
  saving,
  coverPreview,
  coverFile,
  onFormChange,
  onCoverFileChange,
  onClearCover,
  onSubmit,
  onClose,
}: SeriesEditorModalProps) {
  return (
    <Modal
      open={editor !== null}
      title={editor?.mode === 'edit' ? '시리즈 수정' : '새 시리즈'}
      okText={editor?.mode === 'edit' ? '저장' : '생성'}
      cancelText="취소"
      confirmLoading={saving}
      onOk={() => {
        void onSubmit();
      }}
      onCancel={onClose}
      destroyOnHidden
      width={640}
    >
      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label} htmlFor="series-title">제목 *</label>
          <Input
            id="series-title"
            value={formState.title}
            onChange={(event) => onFormChange({ title: event.target.value })}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="series-slug">슬러그</label>
          <Input
            id="series-slug"
            value={formState.slug}
            placeholder="비워두면 제목으로 자동 생성"
            onChange={(event) => onFormChange({ slug: event.target.value })}
          />
          <span className={styles.helper}>공개 URL에 사용됩니다. /series/&lt;slug&gt;</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>커버 이미지</span>
          <ImageSelectionCard
            imageUrl={coverPreview}
            imageAlt="시리즈 커버 미리보기"
            placeholder="커버 이미지 없음"
            selectedFile={coverFile}
            chooseLabel={coverPreview ? '이미지 교체' : '이미지 선택'}
            removeLabel="이미지 제거"
            helperText="JPG, PNG, WEBP, GIF 파일을 업로드할 수 있습니다. 저장 버튼을 누르면 반영됩니다."
            disabled={saving}
            canRemove={Boolean(coverPreview || coverFile)}
            classNames={{
              input: styles.hiddenInput,
              card: styles.coverCard,
              preview: styles.coverPreview,
              image: styles.coverPreviewImage,
              placeholder: styles.coverPlaceholder,
              content: styles.coverMeta,
              actions: styles.coverActions,
              helper: styles.helper,
              fileMeta: styles.fileMeta,
            }}
            onSelectFile={onCoverFileChange}
            onRemove={onClearCover}
          />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label} htmlFor="series-desc">설명</label>
          <textarea
            id="series-desc"
            className={styles.textarea}
            value={formState.description}
            onChange={(event) => onFormChange({ description: event.target.value })}
          />
        </div>
        {formError && <Alert type="error" message={formError} />}
      </div>
    </Modal>
  );
}
