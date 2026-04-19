import { api, createFormData } from './api';
import { createAreaRoutes } from './api-routes';
import type {
  Series,
  CreateSeriesPayload,
  UpdateSeriesPayload,
  AssignPostsPayload,
} from '@/types';

const seriesRoutes = createAreaRoutes('series');

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicSeriesService = {
  async getAll(): Promise<Series[]> {
    return api.get<Series[]>(seriesRoutes.public());
  },

  async getBySlug(slug: string): Promise<Series> {
    return api.get<Series>(seriesRoutes.public(slug));
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioSeriesService = {
  async create(payload: CreateSeriesPayload): Promise<Series> {
    return api.post<Series>(seriesRoutes.studio(), payload);
  },

  async getAll(): Promise<Series[]> {
    return api.get<Series[]>(seriesRoutes.studio());
  },

  async getById(id: number): Promise<Series> {
    return api.get<Series>(seriesRoutes.studio(id));
  },

  async update(id: number, payload: UpdateSeriesPayload): Promise<Series> {
    return api.patch<Series>(seriesRoutes.studio(id), payload);
  },

  async uploadCoverImage(id: number, file: File): Promise<Series> {
    const form = createFormData({ image: file });
    return api.post<Series>(seriesRoutes.studio(id, 'cover-image'), form);
  },

  async removeCoverImage(id: number): Promise<Series> {
    return api.delete<Series>(seriesRoutes.studio(id, 'cover-image'));
  },

  async assignPosts(id: number, payload: AssignPostsPayload): Promise<Series> {
    return api.patch<Series>(seriesRoutes.studio(id, 'posts'), payload);
  },

  async remove(id: number): Promise<void> {
    await api.delete(seriesRoutes.studio(id));
  },
};
