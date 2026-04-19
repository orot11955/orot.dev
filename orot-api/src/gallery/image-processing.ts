import { mkdir } from 'fs/promises';
import { createRequire } from 'module';
import { join, parse } from 'path';

type SharpLike = (input: string) => {
  metadata(): Promise<{ width?: number; height?: number }>;
  resize(options: { width: number; withoutEnlargement: boolean }): {
    webp(options: { quality: number }): {
      toFile(output: string): Promise<unknown>;
    };
  };
};

const requireFromApi = createRequire(__filename);

function loadSharp(): SharpLike | null {
  try {
    return requireFromApi(
      join(process.cwd(), '..', 'orot-web', 'node_modules', 'sharp'),
    ) as SharpLike;
  } catch {
    return null;
  }
}

export async function createGalleryThumbnail(
  inputPath: string,
  filename: string,
) {
  const sharp = loadSharp();
  if (!sharp) {
    return { thumbnailUrl: undefined, width: undefined, height: undefined };
  }

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  const thumbDir = join(process.cwd(), 'uploads', 'gallery', 'thumbs');
  await mkdir(thumbDir, { recursive: true });

  const thumbName = `${parse(filename).name}.webp`;
  const outputPath = join(thumbDir, thumbName);

  await image
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);

  return {
    thumbnailUrl: `/uploads/gallery/thumbs/${thumbName}`,
    width: metadata.width,
    height: metadata.height,
  };
}
