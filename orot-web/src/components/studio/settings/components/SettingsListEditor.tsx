'use client';

import type { ReactNode } from 'react';
import { Button } from 'orot-ui';
import styles from '../SettingsPage.module.css';

interface SettingsListEditorProps {
  hasItems: boolean;
  emptyMessage: string;
  children: ReactNode;
  addLabel?: string;
  addDisabled?: boolean;
  onAdd?: () => void;
}

export function SettingsListEditor({
  hasItems,
  emptyMessage,
  children,
  addLabel,
  addDisabled = false,
  onAdd,
}: SettingsListEditorProps) {
  return (
    <div className={styles.listWrap}>
      {hasItems ? children : (
        <div className={styles.emptyList}>{emptyMessage}</div>
      )}
      {onAdd && addLabel ? (
        <div className={styles.addRow}>
          <Button
            variant="outlined"
            onClick={onAdd}
            disabled={addDisabled}
          >
            {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
