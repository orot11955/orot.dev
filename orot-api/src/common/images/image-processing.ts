import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { extractTakenAtFromExif } from './exif';
import { loadSharp } from './sharp-loader';

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

export async function createWebpThumbnail(
  options: WebpThumbnailOptions,
): Promise<ImageDetails | null> {
  const sharp = loadSharp();
  if (!sharp) {
    return null;
  }

  const image = sharp(options.inputPath);
  const metadata = await image.metadata();

  await mkdir(dirname(options.outputPath), { recursive: true });

  await image
    .resize({ width: options.width, withoutEnlargement: true })
    .webp({ quality: options.quality })
    .toFile(options.outputPath);

  return {
    width: metadata.width,
    height: metadata.height,
    takenAt: extractTakenAtFromExif(metadata.exif),
  };
}
