import {
  createResource,
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
const MAX_BATCH_UPLOAD_REQUEST_BYTES = 45 * 1024 * 1024;
const MAX_BATCH_UPLOAD_FILES = 20;

function chunkGalleryUploadFiles(files: File[]) {
  const chunks: File[][] = [];
  let currentChunk: File[] = [];
  let currentChunkBytes = 0;

  for (const file of files) {
    const exceedsChunkSize =
      currentChunk.length > 0 &&
      currentChunkBytes + file.size > MAX_BATCH_UPLOAD_REQUEST_BYTES;
    const exceedsChunkCount = currentChunk.length >= MAX_BATCH_UPLOAD_FILES;

    if (exceedsChunkSize || exceedsChunkCount) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkBytes = 0;
    }

    currentChunk.push(file);
    currentChunkBytes += file.size;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

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
    const uploadChunks = chunkGalleryUploadFiles(files);
    const uploadedItems: GalleryItem[] = [];

    for (let index = 0; index < uploadChunks.length; index += 1) {
      const chunk = uploadChunks[index];
      const previousFilesCount = uploadChunks
        .slice(0, index)
        .reduce((sum, item) => sum + item.length, 0);

      const items = await uploadImageResources<GalleryItem[]>(
        galleryRoutes.studio('batch'),
        chunk,
        {
          title: payload.title,
          description: payload.description,
          altText: payload.altText,
          takenAt: payload.takenAt,
          sortOrder:
            payload.sortOrder == null
              ? undefined
              : payload.sortOrder + previousFilesCount,
        },
      );

      uploadedItems.push(...items);
    }

    return uploadedItems;
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

  async reprocess(id: number): Promise<GalleryItem> {
    return createResource<GalleryItem>(galleryRoutes.studio(id, 'reprocess'));
  },

  async remove(id: number): Promise<void> {
    await deleteResource(galleryRoutes.studio(id));
  },
};
