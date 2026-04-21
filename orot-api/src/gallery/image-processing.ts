import { join, parse } from 'path';
import { createWebpThumbnail } from '../common/images/image-processing';

export async function createGalleryThumbnail(
  inputPath: string,
  filename: string,
) {
  const thumbName = `${parse(filename).name}.webp`;
  const outputPath = join(
    process.cwd(),
    'uploads',
    'gallery',
    'thumbs',
    thumbName,
  );
  const thumbnail = await createWebpThumbnail({
    inputPath,
    outputPath,
    width: 960,
    quality: 82,
  });

  if (!thumbnail) {
    return {
      thumbnailUrl: undefined,
      width: undefined,
      height: undefined,
      takenAt: undefined,
    };
  }

  return {
    thumbnailUrl: `/uploads/gallery/thumbs/${thumbName}`,
    width: thumbnail.width,
    height: thumbnail.height,
    takenAt: thumbnail.takenAt,
  };
}
