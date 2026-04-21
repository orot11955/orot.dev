import { createRequire } from 'module';
import { join } from 'path';

export type SharpLike = (input: string) => {
  metadata(): Promise<{ width?: number; height?: number; exif?: Buffer }>;
  resize(options: { width: number; withoutEnlargement: boolean }): {
    webp(options: { quality: number }): {
      toFile(output: string): Promise<unknown>;
    };
  };
};

const requireFromApi = createRequire(__filename);

// Docker's API image does not include the web workspace, so prefer a local
// install and keep the monorepo fallback for older dev setups.
const sharpModuleIds = [
  'sharp',
  join(process.cwd(), '..', 'orot-web', 'node_modules', 'sharp'),
] as const;

function isMissingModuleError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND')
  );
}

export function loadSharp(): SharpLike | null {
  for (const moduleId of sharpModuleIds) {
    try {
      return requireFromApi(moduleId) as SharpLike;
    } catch (error) {
      if (!isMissingModuleError(error)) {
        throw error;
      }
    }
  }

  return null;
}
