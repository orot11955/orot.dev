'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Button,
  Modal,
  RotateCcw,
  Slider,
  Typography,
  ZoomIn,
  ZoomOut,
} from 'orot-ui';
import styles from './ImageEditorModal.module.css';

interface CropBoxSize {
  width: number;
  height: number;
}

interface ImageSize {
  width: number;
  height: number;
}

interface CropPosition {
  x: number;
  y: number;
}

interface PointerDragState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

export interface ImageEditorModalProps {
  open: boolean;
  file: File | null;
  title?: string;
  description?: string;
  shape?: 'square' | 'circle';
  aspectRatio?: number;
  outputWidth?: number;
  outputType?: 'image/png' | 'image/jpeg' | 'image/webp';
  outputQuality?: number;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void> | void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_OUTPUT_WIDTH = 1024;

function getAspectHeight(width: number, aspectRatio: number): number {
  return Math.max(1, Math.round(width / aspectRatio));
}

function clampPosition(
  position: CropPosition,
  zoom: number,
  cropBox: CropBoxSize,
  imageSize: ImageSize | null,
): CropPosition {
  if (!imageSize || cropBox.width <= 0 || cropBox.height <= 0) {
    return { x: 0, y: 0 };
  }

  const baseScale = Math.max(
    cropBox.width / imageSize.width,
    cropBox.height / imageSize.height,
  );
  const scaledWidth = imageSize.width * baseScale * zoom;
  const scaledHeight = imageSize.height * baseScale * zoom;
  const maxX = Math.max(0, (scaledWidth - cropBox.width) / 2);
  const maxY = Math.max(0, (scaledHeight - cropBox.height) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, position.x)),
    y: Math.min(maxY, Math.max(-maxY, position.y)),
  };
}

function getOutputType(
  preferredType: ImageEditorModalProps['outputType'] | undefined,
  sourceFile: File | null,
): NonNullable<ImageEditorModalProps['outputType']> {
  if (preferredType) {
    return preferredType;
  }

  if (
    sourceFile?.type === 'image/jpeg' ||
    sourceFile?.type === 'image/png' ||
    sourceFile?.type === 'image/webp'
  ) {
    return sourceFile.type;
  }

  return 'image/png';
}

function getEditedFilename(name: string, mimeType: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  const extension =
    mimeType === 'image/jpeg'
      ? 'jpg'
      : mimeType === 'image/webp'
        ? 'webp'
        : 'png';

  return `${base}-edited.${extension}`;
}

export function ImageEditorModal({
  open,
  file,
  title = '이미지 편집',
  description = '잘라낼 영역을 드래그하고 확대 비율을 조정하세요.',
  shape = 'square',
  aspectRatio = 1,
  outputWidth = DEFAULT_OUTPUT_WIDTH,
  outputType,
  outputQuality = 0.92,
  cancelText = '취소',
  confirmText = '적용',
  onCancel,
  onConfirm,
}: ImageEditorModalProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [cropBoxSize, setCropBoxSize] = useState<CropBoxSize>({
    width: 0,
    height: 0,
  });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [position, setPosition] = useState<CropPosition>({ x: 0, y: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cropBoxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStateRef = useRef<PointerDragState | null>(null);

  useEffect(() => {
    if (!file || !open) {
      setPreviewUrl('');
      setImageSize(null);
      setZoom(MIN_ZOOM);
      setPosition({ x: 0, y: 0 });
      setError(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    setImageSize(null);
    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
    setError(null);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const cropBox = cropBoxRef.current;
    if (!cropBox) {
      return;
    }

    const updateSize = () => {
      setCropBoxSize({
        width: cropBox.clientWidth,
        height: cropBox.clientHeight,
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(cropBox);

    return () => {
      observer.disconnect();
    };
  }, [open]);

  useEffect(() => {
    setPosition((current) =>
      clampPosition(current, zoom, cropBoxSize, imageSize),
    );
  }, [zoom, cropBoxSize, imageSize]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const nextPosition = {
        x: dragState.originX + (event.clientX - dragState.startX),
        y: dragState.originY + (event.clientY - dragState.startY),
      };

      setPosition(clampPosition(nextPosition, zoom, cropBoxSize, imageSize));
    };

    const stopDragging = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [open, zoom, cropBoxSize, imageSize]);

  const baseScale = useMemo(() => {
    if (!imageSize || cropBoxSize.width <= 0 || cropBoxSize.height <= 0) {
      return 1;
    }

    return Math.max(
      cropBoxSize.width / imageSize.width,
      cropBoxSize.height / imageSize.height,
    );
  }, [imageSize, cropBoxSize]);

  const imageCanvasStyle = useMemo(() => {
    if (!imageSize) {
      return undefined;
    }

    return {
      width: `${imageSize.width * baseScale}px`,
      height: `${imageSize.height * baseScale}px`,
      transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
    };
  }, [imageSize, baseScale, position]);

  const previewImageStyle = useMemo(
    () => ({
      transform: `scale(${zoom})`,
    }),
    [zoom],
  );

  const handleZoomChange = useCallback(
    (nextValue: number) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextValue));
      setZoom(nextZoom);
      setPosition((current) =>
        clampPosition(current, nextZoom, cropBoxSize, imageSize),
      );
    },
    [cropBoxSize, imageSize],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!imageSize) {
        return;
      }

      event.preventDefault();
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
      };
    },
    [imageSize, position],
  );

  const handleReset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      setError(null);

      if (!file || !imageSize || !imageRef.current) {
        return;
      }

      const cropWidth = cropBoxSize.width;
      const cropHeight = cropBoxSize.height;
      if (cropWidth <= 0 || cropHeight <= 0) {
        return;
      }

      const scale = baseScale * zoom;
      if (!Number.isFinite(scale) || scale <= 0) {
        return;
      }

      const sourceCropWidth = cropWidth / scale;
      const sourceCropHeight = cropHeight / scale;
      const sourceCenterX = imageSize.width / 2 - position.x / scale;
      const sourceCenterY = imageSize.height / 2 - position.y / scale;
      const sourceX = Math.max(
        0,
        Math.min(
          imageSize.width - sourceCropWidth,
          sourceCenterX - sourceCropWidth / 2,
        ),
      );
      const sourceY = Math.max(
        0,
        Math.min(
          imageSize.height - sourceCropHeight,
          sourceCenterY - sourceCropHeight / 2,
        ),
      );

      const nextOutputType = getOutputType(outputType, file);
      const nextOutputHeight = getAspectHeight(outputWidth, aspectRatio);
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = nextOutputHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('이미지 편집 캔버스를 초기화하지 못했습니다.');
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        imageRef.current,
        sourceX,
        sourceY,
        sourceCropWidth,
        sourceCropHeight,
        0,
        0,
        outputWidth,
        nextOutputHeight,
      );

      setSubmitting(true);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, nextOutputType, outputQuality);
      });

      if (!blob) {
        throw new Error('편집된 이미지를 만들지 못했습니다.');
      }

      const editedFile = new File(
        [blob],
        getEditedFilename(file.name, nextOutputType),
        {
          type: nextOutputType,
          lastModified: Date.now(),
        },
      );

      await onConfirm(editedFile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '이미지를 처리하지 못했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    aspectRatio,
    baseScale,
    cropBoxSize,
    file,
    imageSize,
    onConfirm,
    outputQuality,
    outputType,
    outputWidth,
    position,
    zoom,
  ]);

  const cropShapeClass =
    shape === 'circle' ? styles.cropBoxCircle : styles.cropBoxSquare;

  return (
    <Modal
      open={open}
      title={title}
      width={920}
      centered
      closable={!submitting}
      maskClosable={!submitting}
      keyboard={!submitting}
      onCancel={submitting ? undefined : onCancel}
      footer={
        <div className={styles.footer}>
          <Button variant="text" onClick={handleReset} disabled={submitting}>
            초기화
          </Button>
          <div className={styles.footerActions}>
            <Button variant="outlined" onClick={onCancel} disabled={submitting}>
              {cancelText}
            </Button>
            <Button
              variant="solid"
              onClick={() => void handleConfirm()}
              loading={submitting}
              disabled={!file || !imageSize}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      }
      destroyOnHidden
      className={styles.modal}
    >
      <div className={styles.body}>
        <div className={styles.workspace}>
          <div
            ref={cropBoxRef}
            className={`${styles.cropBox} ${cropShapeClass}`}
            style={{ aspectRatio: String(aspectRatio) }}
            onPointerDown={handlePointerDown}
          >
            {previewUrl ? (
              <>
                {!imageSize && (
                  <div className={styles.emptyState}>이미지를 준비하는 중입니다.</div>
                )}
                <div className={styles.imageCanvas} style={imageCanvasStyle}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt=""
                    draggable={false}
                    className={styles.previewImage}
                    style={previewImageStyle}
                    onLoad={(event) => {
                      setImageSize({
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight,
                      });
                    }}
                  />
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>이미지를 준비하는 중입니다.</div>
            )}
          </div>
        </div>

        <aside className={styles.sidebar}>
          {error && (
            <Alert
              type="error"
              message="이미지 편집을 완료하지 못했습니다."
              description={error}
            />
          )}
          <div className={styles.copyBlock}>
            <Typography.Paragraph className={styles.description}>
              {description}
            </Typography.Paragraph>
            {file && (
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileDetail}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>

          <div className={styles.controlBlock}>
            <div className={styles.controlHeader}>
              <ZoomOut size={16} />
              <span>확대</span>
              <ZoomIn size={16} />
            </div>
            <Slider
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              tooltip={{
                formatter: (value) => `${value.toFixed(2)}x`,
              }}
              onChange={(value) => {
                if (typeof value === 'number') {
                  handleZoomChange(value);
                }
              }}
            />
            <div className={styles.zoomMeta}>
              <span>{MIN_ZOOM.toFixed(1)}x</span>
              <span>{zoom.toFixed(2)}x</span>
              <span>{MAX_ZOOM.toFixed(1)}x</span>
            </div>
          </div>

          <div className={styles.tipBlock}>
            <div className={styles.tipTitle}>
              <RotateCcw size={16} />
              <span>사용 방법</span>
            </div>
            <ul className={styles.tipList}>
              <li>이미지를 드래그해서 보여줄 위치를 맞춥니다.</li>
              <li>슬라이더로 확대 비율을 조정합니다.</li>
              <li>적용을 누르면 편집된 이미지로 업로드합니다.</li>
            </ul>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
