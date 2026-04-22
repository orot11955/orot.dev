import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { extractTakenAtFromExif } from './exif';
import { loadSharp, type SharpMetadata } from './sharp-loader';

export interface ImageDetails {
  width?: number;
  height?: number;
  takenAt?: Date;
}

export interface WebpThumbnailOptions {
  inputPath: string;
  outputPath: string;
  width: number;
  quality: number;
}

const SWAPPED_EXIF_ORIENTATIONS = new Set([5, 6, 7, 8]);

function resolveDisplaySize(metadata: SharpMetadata) {
  const { width, height, orientation } = metadata;

  if (
    width === undefined ||
    height === undefined ||
    !SWAPPED_EXIF_ORIENTATIONS.has(orientation ?? 0)
  ) {
    return { width, height };
  }

  return {
    width: height,
    height: width,
  };
}

export async function createWebpThumbnail(
  options: WebpThumbnailOptions,
): Promise<ImageDetails | null> {
  const sharp = loadSharp();
  if (!sharp) {
    return null;
  }

  const metadata = await sharp(options.inputPath).metadata();
  const displaySize = resolveDisplaySize(metadata);

  await mkdir(dirname(options.outputPath), { recursive: true });

  await sharp(options.inputPath)
    .rotate()
    .resize({ width: options.width, withoutEnlargement: true })
    .webp({ quality: options.quality })
    .toFile(options.outputPath);

  return {
    width: displaySize.width,
    height: displaySize.height,
    takenAt: extractTakenAtFromExif(metadata.exif),
  };
}
