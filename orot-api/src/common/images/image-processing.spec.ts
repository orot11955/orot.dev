import { mkdir } from 'fs/promises';
import { extractTakenAtFromExif } from './exif';
import { createWebpThumbnail } from './image-processing';
import { loadSharp } from './sharp-loader';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
}));

jest.mock('./exif', () => ({
  extractTakenAtFromExif: jest.fn(),
}));

jest.mock('./sharp-loader', () => ({
  loadSharp: jest.fn(),
}));

function createSharpInstance(metadataValue: {
  width?: number;
  height?: number;
  exif?: Buffer;
  orientation?: number;
}) {
  const instance = {
    metadata: jest.fn(),
    rotate: jest.fn(),
    resize: jest.fn(),
    webp: jest.fn(),
    toFile: jest.fn(),
  };

  instance.metadata.mockResolvedValue(metadataValue);
  instance.rotate.mockReturnValue(instance);
  instance.resize.mockReturnValue(instance);
  instance.webp.mockReturnValue(instance);
  instance.toFile.mockResolvedValue(undefined);

  return instance;
}

describe('createWebpThumbnail', () => {
  const mkdirMock = jest.mocked(mkdir);
  const extractTakenAtFromExifMock = jest.mocked(extractTakenAtFromExif);
  const loadSharpMock = jest.mocked(loadSharp);

  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
  });

  it('rotates EXIF-oriented images before writing the thumbnail', async () => {
    const takenAt = new Date('2024-03-09T14:22:10.000Z');
    const sharpInstance = createSharpInstance({
      width: 4032,
      height: 3024,
      orientation: 6,
      exif: Buffer.from('exif'),
    });

    loadSharpMock.mockReturnValue(() => sharpInstance);
    extractTakenAtFromExifMock.mockReturnValue(takenAt);

    const result = await createWebpThumbnail({
      inputPath: '/tmp/photo.jpg',
      outputPath: '/tmp/thumbs/photo.webp',
      width: 960,
      quality: 82,
    });

    expect(sharpInstance.rotate).toHaveBeenCalledWith();
    expect(sharpInstance.resize).toHaveBeenCalledWith({
      width: 960,
      withoutEnlargement: true,
    });
    expect(sharpInstance.webp).toHaveBeenCalledWith({ quality: 82 });
    expect(sharpInstance.toFile).toHaveBeenCalledWith('/tmp/thumbs/photo.webp');
    expect(result).toEqual({
      width: 3024,
      height: 4032,
      takenAt,
    });
  });

  it('returns null when sharp is unavailable', async () => {
    loadSharpMock.mockReturnValue(null);

    const result = await createWebpThumbnail({
      inputPath: '/tmp/photo.jpg',
      outputPath: '/tmp/thumbs/photo.webp',
      width: 960,
      quality: 82,
    });

    expect(result).toBeNull();
    expect(mkdirMock).not.toHaveBeenCalled();
  });
});
