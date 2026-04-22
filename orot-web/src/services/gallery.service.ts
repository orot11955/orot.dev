import {
  deleteResource,
  getResource,
  listResource,
  patchResource,
  uploadImageResource,
  uploadImageResources,
} from './service-helpers';
import { createAreaRoutes } from './api-routes';
import type {
  GalleryItem,
  GalleryListResponse,
  GalleryQuery,
  CreateGalleryItemPayload,
  UpdateGalleryItemPayload,
} from '@/types';

const galleryRoutes = createAreaRoutes('gallery');

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicGalleryService = {
  async getAll(query: GalleryQuery = {}): Promise<GalleryListResponse> {
    return listResource<GalleryListResponse['data'][number]>(
      galleryRoutes.public(),
      query,
    );
  },

  async getById(id: number): Promise<GalleryItem> {
    return getResource<GalleryItem>(galleryRoutes.public(id));
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioGalleryService = {
  async upload(
    file: File,
    payload: CreateGalleryItemPayload,
  ): Promise<GalleryItem> {
    return uploadImageResource<GalleryItem>(galleryRoutes.studio(), file, {
      title: payload.title,
      description: payload.description,
      altText: payload.altText,
      takenAt: payload.takenAt,
      sortOrder: payload.sortOrder,
    });
  },

  async uploadMany(
    files: File[],
    payload: CreateGalleryItemPayload,
  ): Promise<GalleryItem[]> {
    return uploadImageResources<GalleryItem[]>(
      galleryRoutes.studio('batch'),
      files,
      {
        title: payload.title,
        description: payload.description,
        altText: payload.altText,
        takenAt: payload.takenAt,
        sortOrder: payload.sortOrder,
      },
    );
  },

  async getAll(query: GalleryQuery = {}): Promise<GalleryListResponse> {
    return listResource<GalleryListResponse['data'][number]>(
      galleryRoutes.studio(),
      query,
    );
  },

  async getById(id: number): Promise<GalleryItem> {
    return getResource<GalleryItem>(galleryRoutes.studio(id));
  },

  async update(
    id: number,
    payload: UpdateGalleryItemPayload,
  ): Promise<GalleryItem> {
    return patchResource<GalleryItem, UpdateGalleryItemPayload>(
      galleryRoutes.studio(id),
      payload,
    );
  },

  async togglePublish(id: number): Promise<GalleryItem> {
    return patchResource<GalleryItem>(galleryRoutes.studio(id, 'publish'));
  },

  async remove(id: number): Promise<void> {
    await deleteResource(galleryRoutes.studio(id));
  },
};
