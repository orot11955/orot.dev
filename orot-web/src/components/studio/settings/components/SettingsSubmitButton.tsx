'use client';

import type { ReactNode } from 'react';
import { Button } from 'orot-ui';

interface SettingsSubmitButtonProps {
  label?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export function SettingsSubmitButton({
  label = '저장',
  loading = false,
  disabled = false,
  onClick,
}: SettingsSubmitButtonProps) {
  return (
    <Button
      variant="solid"
      loading={loading}
      disabled={disabled}
      onClick={() => {
        void onClick();
      }}
    >
      {label}
    </Button>
  );
}
