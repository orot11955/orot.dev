import { api, createFormData } from './api';
import { createAreaRoutes } from './api-routes';
import type { PublicSettings, StudioSettings, UpdateSettingsPayload } from '@/types';

const settingsRoutes = createAreaRoutes('settings');

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicSettingsService = {
  async get(): Promise<PublicSettings> {
    return api.get<PublicSettings>(settingsRoutes.public());
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioSettingsService = {
  async get(): Promise<StudioSettings> {
    return api.get<StudioSettings>(settingsRoutes.studio());
  },

  async update(payload: UpdateSettingsPayload): Promise<StudioSettings> {
    return api.patch<StudioSettings>(settingsRoutes.studio(), {
      settings: Object.entries(payload).map(([key, value]) => ({ key, value })),
    });
  },

  async uploadMedia(
    key: 'about_nametag_image',
    file: File,
  ): Promise<StudioSettings> {
    const form = createFormData({ image: file });
    return api.post<StudioSettings>(settingsRoutes.studio('media', key), form);
  },
};
