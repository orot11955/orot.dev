import type { Request } from 'express';
import { mkdirSync, unlinkSync } from 'fs';
import { diskStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { extname, join } from 'path';

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

type FilenamePrefixResolver =
  | string
  | ((req: Request, file: Express.Multer.File) => string | null | undefined);

function sanitizeUploadSegment(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

function sanitizeFilenamePrefix(value?: string | null) {
  const sanitized = value?.replace(/[^a-z0-9_-]/gi, '-').trim();
  return sanitized || undefined;
}

export function resolveUploadsDiskPath(...segments: string[]) {
  return join(process.cwd(), 'uploads', ...segments.map(sanitizeUploadSegment));
}

export function toUploadsPublicUrl(...segments: string[]) {
  return `/uploads/${segments.map(sanitizeUploadSegment).join('/')}`;
}

export function createImageUploadOptions(options: {
  directory: string[];
  maxFileSizeBytes: number;
  filenamePrefix?: FilenamePrefixResolver;
}) {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const uploadDir = resolveUploadsDiskPath(...options.directory);
        mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (req: Request, file, cb) => {
        const resolvedPrefix =
          typeof options.filenamePrefix === 'function'
            ? options.filenamePrefix(req, file)
            : options.filenamePrefix;
        const prefix = sanitizeFilenamePrefix(resolvedPrefix);
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const baseName = prefix ? `${prefix}-${unique}` : unique;

        cb(null, `${baseName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: FileFilterCallback,
    ) => {
      if (
        ALLOWED_IMAGE_MIME.includes(
          file.mimetype as (typeof ALLOWED_IMAGE_MIME)[number],
        )
      ) {
        cb(null, true);
        return;
      }

      cb(new Error('Only image files are allowed'));
    },
    limits: { fileSize: options.maxFileSizeBytes },
  };
}

export function safeRemoveFile(filePath?: string | null) {
  if (!filePath) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch {
    // noop
  }
}

export function safeRemoveUploadedAsset(
  publicPath?: string | null,
  expectedPrefix?: string,
) {
  if (!publicPath) {
    return;
  }

  if (expectedPrefix && !publicPath.startsWith(expectedPrefix)) {
    return;
  }

  safeRemoveFile(join(process.cwd(), publicPath.replace(/^\//, '')));
}

export async function replaceManagedUpload<T>(options: {
  tempFilePath: string;
  nextPublicPath: string;
  currentPublicPath?: string | null;
  expectedCurrentPrefix: string;
  update: (nextPublicPath: string) => Promise<T>;
}) {
  try {
    const updated = await options.update(options.nextPublicPath);
    safeRemoveUploadedAsset(
      options.currentPublicPath,
      options.expectedCurrentPrefix,
    );
    return updated;
  } catch (error) {
    safeRemoveFile(options.tempFilePath);
    throw error;
  }
}

export async function removeManagedUpload<T>(options: {
  currentPublicPath?: string | null;
  expectedCurrentPrefix: string;
  update: () => Promise<T>;
}) {
  const updated = await options.update();
  safeRemoveUploadedAsset(
    options.currentPublicPath,
    options.expectedCurrentPrefix,
  );
  return updated;
}
