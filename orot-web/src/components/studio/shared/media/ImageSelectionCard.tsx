'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from 'orot-ui';

interface ImageSelectionCardClassNames {
  input: string;
  card: string;
  preview: string;
  image: string;
  placeholder: string;
  content: string;
  actions: string;
  helper: string;
  fileMeta?: string;
  footer?: string;
}

interface ImageSelectionCardProps {
  imageUrl: string;
  imageAlt: string;
  placeholder: string;
  accept?: string;
  selectedFile?: File | null;
  chooseLabel: string;
  removeLabel: string;
  removePendingLabel?: string;
  helperText: ReactNode;
  footerText?: ReactNode;
  chooseLoading?: boolean;
  removing?: boolean;
  disabled?: boolean;
  canRemove: boolean;
  classNames: ImageSelectionCardClassNames;
  onSelectFile: (file: File | null) => void;
  onRemove: () => void | Promise<void>;
}

function formatSelectedFile(file: File) {
  return `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
}

export function ImageSelectionCard({
  imageUrl,
  imageAlt,
  placeholder,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  selectedFile,
  chooseLabel,
  removeLabel,
  removePendingLabel,
  helperText,
  footerText,
  chooseLoading = false,
  removing = false,
  disabled = false,
  canRemove,
  classNames,
  onSelectFile,
  onRemove,
}: ImageSelectionCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className={classNames.input}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onSelectFile(file);
          event.currentTarget.value = '';
        }}
      />
      <div className={classNames.card}>
        <div className={classNames.preview}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={imageAlt}
              className={classNames.image}
            />
          ) : (
            <div className={classNames.placeholder}>{placeholder}</div>
          )}
        </div>
        <div className={classNames.content}>
          <div className={classNames.actions}>
            <Button
              size="sm"
              variant="outlined"
              loading={chooseLoading}
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {chooseLabel}
            </Button>
            <Button
              size="sm"
              variant="text"
              disabled={disabled || !canRemove}
              onClick={() => {
                void onRemove();
              }}
            >
              {removing && removePendingLabel ? removePendingLabel : removeLabel}
            </Button>
          </div>
          <span className={classNames.helper}>{helperText}</span>
          {selectedFile && classNames.fileMeta ? (
            <span className={classNames.fileMeta}>{formatSelectedFile(selectedFile)}</span>
          ) : null}
        </div>
      </div>
      {footerText && classNames.footer ? (
        <span className={classNames.footer}>{footerText}</span>
      ) : null}
    </>
  );
}
