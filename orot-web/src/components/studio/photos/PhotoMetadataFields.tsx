'use client';

import { Input } from 'orot-ui';
import type { PhotoFormState } from './photo-form';
import styles from './PhotosManagement.module.css';

interface PhotoMetadataFieldsProps {
  form: PhotoFormState;
  idPrefix: string;
  takenAtHint?: string;
  onChange: (patch: Partial<PhotoFormState>) => void;
}

export function PhotoMetadataFields({
  form,
  idPrefix,
  takenAtHint,
  onChange,
}: PhotoMetadataFieldsProps) {
  return (
    <>
      <div className={styles.detailRow}>
        <label className={styles.detailLabel} htmlFor={`${idPrefix}-title`}>
          제목
        </label>
        <Input
          id={`${idPrefix}-title`}
          value={form.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>

      <div className={styles.detailRow}>
        <label className={styles.detailLabel} htmlFor={`${idPrefix}-description`}>
          설명
        </label>
        <textarea
          id={`${idPrefix}-description`}
          className={styles.nativeTextarea}
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </div>

      <div className={styles.detailRow}>
        <label className={styles.detailLabel} htmlFor={`${idPrefix}-alt`}>
          대체 텍스트
        </label>
        <Input
          id={`${idPrefix}-alt`}
          value={form.altText}
          onChange={(event) => onChange({ altText: event.target.value })}
        />
      </div>

      <div className={styles.detailRow}>
        <label className={styles.detailLabel} htmlFor={`${idPrefix}-taken`}>
          촬영일
        </label>
        <input
          id={`${idPrefix}-taken`}
          type="date"
          className={styles.nativeInput}
          value={form.takenAt}
          onChange={(event) => onChange({ takenAt: event.target.value })}
        />
        {takenAtHint && (
          <span className={styles.detailHint}>{takenAtHint}</span>
        )}
      </div>

      <div className={styles.detailRow}>
        <label className={styles.detailLabel} htmlFor={`${idPrefix}-order`}>
          정렬 순서
        </label>
        <input
          id={`${idPrefix}-order`}
          type="number"
          className={styles.nativeInput}
          value={form.sortOrder}
          onChange={(event) => onChange({ sortOrder: event.target.value })}
        />
      </div>
    </>
  );
}
