import {
  createResource,
  deleteResource,
  getResource,
  patchResource,
  uploadImageResource,
} from './service-helpers';
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
    return getResource<Series[]>(seriesRoutes.public());
  },

  async getBySlug(slug: string): Promise<Series> {
    return getResource<Series>(seriesRoutes.public(slug));
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioSeriesService = {
  async create(payload: CreateSeriesPayload): Promise<Series> {
    return createResource<Series, CreateSeriesPayload>(seriesRoutes.studio(), payload);
  },

  async getAll(): Promise<Series[]> {
    return getResource<Series[]>(seriesRoutes.studio());
  },

  async getById(id: number): Promise<Series> {
    return getResource<Series>(seriesRoutes.studio(id));
  },

  async update(id: number, payload: UpdateSeriesPayload): Promise<Series> {
    return patchResource<Series, UpdateSeriesPayload>(seriesRoutes.studio(id), payload);
  },

  async uploadCoverImage(id: number, file: File): Promise<Series> {
    return uploadImageResource<Series>(seriesRoutes.studio(id, 'cover-image'), file);
  },

  async removeCoverImage(id: number): Promise<Series> {
    return deleteResource<Series>(seriesRoutes.studio(id, 'cover-image'));
  },

  async assignPosts(id: number, payload: AssignPostsPayload): Promise<Series> {
    return patchResource<Series, AssignPostsPayload>(
      seriesRoutes.studio(id, 'posts'),
      payload,
    );
  },

  async remove(id: number): Promise<void> {
    await deleteResource(seriesRoutes.studio(id));
  },
};
