import { api } from './api';
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
    return api.get<Category[]>(categoryRoutes.public());
  },

  async getBySlug(slug: string): Promise<Category> {
    return api.get<Category>(categoryRoutes.public(slug));
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioCategoriesService = {
  async create(payload: CreateCategoryPayload): Promise<Category> {
    return api.post<Category>(categoryRoutes.studio(), payload);
  },

  async getAll(): Promise<Category[]> {
    return api.get<Category[]>(categoryRoutes.studio());
  },

  async getById(id: number): Promise<Category> {
    return api.get<Category>(categoryRoutes.studio(id));
  },

  async update(
    id: number,
    payload: UpdateCategoryPayload,
  ): Promise<Category> {
    return api.patch<Category>(categoryRoutes.studio(id), payload);
  },

  async remove(id: number): Promise<void> {
    await api.delete(categoryRoutes.studio(id));
  },
};
