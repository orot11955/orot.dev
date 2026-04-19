'use client';

import { FileText } from 'orot-ui';
import styles from './EditorEmptyState.module.css';

export function EditorEmptyState() {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <FileText size={36} strokeWidth={1.5} color="var(--orot-color-text-muted)" />
        <h2 className={styles.title}>좌측에서 글을 선택하세요</h2>
        <p className={styles.desc}>
          새 초안을 만들거나 기존 글을 선택해 작성·편집하세요. 준비가 되면
          스튜디오로 전달할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
