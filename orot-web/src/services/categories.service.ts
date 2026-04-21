import {
  createResource,
  deleteResource,
  getResource,
  patchResource,
} from './service-helpers';
import { createAreaRoutes } from './api-routes';
import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/types';

const categoryRoutes = createAreaRoutes('categories');

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicCategoriesService = {
  async getAll(): Promise<Category[]> {
    return getResource<Category[]>(categoryRoutes.public());
  },

  async getBySlug(slug: string): Promise<Category> {
    return getResource<Category>(categoryRoutes.public(slug));
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioCategoriesService = {
  async create(payload: CreateCategoryPayload): Promise<Category> {
    return createResource<Category, CreateCategoryPayload>(
      categoryRoutes.studio(),
      payload,
    );
  },

  async getAll(): Promise<Category[]> {
    return getResource<Category[]>(categoryRoutes.studio());
  },

  async getById(id: number): Promise<Category> {
    return getResource<Category>(categoryRoutes.studio(id));
  },

  async update(
    id: number,
    payload: UpdateCategoryPayload,
  ): Promise<Category> {
    return patchResource<Category, UpdateCategoryPayload>(
      categoryRoutes.studio(id),
      payload,
    );
  },

  async remove(id: number): Promise<void> {
    await deleteResource(categoryRoutes.studio(id));
  },
};
