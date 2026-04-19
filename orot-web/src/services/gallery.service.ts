import { api, createFormData, toPaginatedResponse } from './api';
import { createAreaRoutes } from './api-routes';
import type {
  GalleryItem,
  GalleryListResponse,
  GalleryQuery,
  CreateGalleryItemPayload,
  UpdateGalleryItemPayload,
  ApiListPayload,
} from '@/types';

const galleryRoutes = createAreaRoutes('gallery');

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicGalleryService = {
  async getAll(query: GalleryQuery = {}): Promise<GalleryListResponse> {
    const data = await api.get<
      ApiListPayload<GalleryListResponse['data'][number]>
    >(
      galleryRoutes.public(),
      { params: query },
    );
    return toPaginatedResponse(data);
  },

  async getById(id: number): Promise<GalleryItem> {
    return api.get<GalleryItem>(galleryRoutes.public(id));
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioGalleryService = {
  async upload(
    file: File,
    payload: CreateGalleryItemPayload,
  ): Promise<GalleryItem> {
    const form = createFormData({
      image: file,
      title: payload.title,
      description: payload.description,
      altText: payload.altText,
      takenAt: payload.takenAt,
      sortOrder: payload.sortOrder,
    });

    return api.post<GalleryItem>(galleryRoutes.studio(), form);
  },

  async getAll(query: GalleryQuery = {}): Promise<GalleryListResponse> {
    const data = await api.get<
      ApiListPayload<GalleryListResponse['data'][number]>
    >(
      galleryRoutes.studio(),
      { params: query },
    );
    return toPaginatedResponse(data);
  },

  async getById(id: number): Promise<GalleryItem> {
    return api.get<GalleryItem>(galleryRoutes.studio(id));
  },

  async update(
    id: number,
    payload: UpdateGalleryItemPayload,
  ): Promise<GalleryItem> {
    return api.patch<GalleryItem>(galleryRoutes.studio(id), payload);
  },

  async togglePublish(id: number): Promise<GalleryItem> {
    return api.patch<GalleryItem>(galleryRoutes.studio(id, 'publish'));
  },

  async remove(id: number): Promise<void> {
    await api.delete(galleryRoutes.studio(id));
  },
};
