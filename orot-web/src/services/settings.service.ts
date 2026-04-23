import {
  getResource,
  patchResource,
  uploadImageResource,
} from './service-helpers';
import { createAreaRoutes } from './api-routes';
import type { PublicSettings, StudioSettings, UpdateSettingsPayload } from '@/types';

const settingsRoutes = createAreaRoutes('settings');
export type ManagedSettingsMediaKey =
  | 'site_logo'
  | 'site_logo_light'
  | 'site_logo_dark'
  | 'site_og_image'
  | 'about_nametag_image';

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicSettingsService = {
  async get(): Promise<PublicSettings> {
    return getResource<PublicSettings>(settingsRoutes.public());
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioSettingsService = {
  async get(): Promise<StudioSettings> {
    return getResource<StudioSettings>(settingsRoutes.studio());
  },

  async update(payload: UpdateSettingsPayload): Promise<StudioSettings> {
    return patchResource<
      StudioSettings,
      { settings: Array<{ key: string; value: string | null | undefined }> }
    >(
      settingsRoutes.studio(),
      {
        settings: Object.entries(payload).map(([key, value]) => ({ key, value })),
      },
    );
  },

  async uploadMedia(
    key: ManagedSettingsMediaKey,
    file: File,
  ): Promise<StudioSettings> {
    return uploadImageResource<StudioSettings>(
      settingsRoutes.studio('media', key),
      file,
    );
  },
};
