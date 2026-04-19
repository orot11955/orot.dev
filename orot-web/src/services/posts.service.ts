import { api, createFormData, toPaginatedResponse } from './api';
import { apiPaths, createAreaRoutes } from './api-routes';
import type {
  Post,
  PostDetail,
  PostListResponse,
  PostQuery,
  CreatePostPayload,
  UpdatePostPayload,
  TransitionPostPayload,
  ApiListPayload,
} from '@/types';
import { normalizePostQuery } from '@/utils/post-query';
import { normalizeSlugParam } from '@/utils/slug';

const postRoutes = createAreaRoutes('posts');

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicPostsService = {
  async getAll(query: PostQuery = {}): Promise<PostListResponse> {
    const params = normalizePostQuery(query);
    const data = await api.get<ApiListPayload<PostListResponse['data'][number]>>(
      postRoutes.public(),
      { params },
    );
    return toPaginatedResponse(data);
  },

  async getBySlug(slug: string): Promise<PostDetail> {
    return api.get<PostDetail>(postRoutes.public(normalizeSlugParam(slug)));
  },

  async recordView(
    slug: string,
  ): Promise<{ viewCount: number; counted: boolean }> {
    return api.post(postRoutes.public(normalizeSlugParam(slug), 'view'));
  },

  async getAllTags(): Promise<string[]> {
    return api.get<string[]>(postRoutes.public('tags'));
  },
};

// ─── Editor ───────────────────────────────────────────────────────────────────

export const editorPostsService = {
  async create(payload: CreatePostPayload): Promise<Post> {
    return api.post<Post>(postRoutes.editor(), payload);
  },

  async getAll(query: PostQuery = {}): Promise<PostListResponse> {
    const params = normalizePostQuery(query);
    const data = await api.get<ApiListPayload<PostListResponse['data'][number]>>(
      postRoutes.editor(),
      { params },
    );
    return toPaginatedResponse(data);
  },

  async getById(id: number): Promise<Post> {
    return api.get<Post>(postRoutes.editor(id));
  },

  async update(id: number, payload: UpdatePostPayload): Promise<Post> {
    return api.patch<Post>(postRoutes.editor(id), payload);
  },

  async uploadCoverImage(id: number, file: File): Promise<Post> {
    const form = createFormData({ image: file });
    return api.post<Post>(postRoutes.editor(id, 'cover-image'), form);
  },

  async removeCoverImage(id: number): Promise<Post> {
    return api.delete<Post>(postRoutes.editor(id, 'cover-image'));
  },

  async transition(
    id: number,
    payload: TransitionPostPayload,
  ): Promise<Post> {
    return api.patch<Post>(postRoutes.editor(id, 'transition'), payload);
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioPostsService = {
  async getAll(query: PostQuery = {}): Promise<PostListResponse> {
    const params = normalizePostQuery(query);
    const data = await api.get<ApiListPayload<PostListResponse['data'][number]>>(
      postRoutes.studio(),
      { params },
    );
    return toPaginatedResponse(data);
  },

  async getById(id: number): Promise<Post> {
    return api.get<Post>(postRoutes.studio(id));
  },

  async getBySlug(slug: string): Promise<PostDetail> {
    return api.get<PostDetail>(
      apiPaths.studio('posts', 'slug', normalizeSlugParam(slug)),
    );
  },

  async update(id: number, payload: UpdatePostPayload): Promise<Post> {
    return api.patch<Post>(postRoutes.studio(id), payload);
  },

  async transition(
    id: number,
    payload: TransitionPostPayload,
  ): Promise<Post> {
    return api.patch<Post>(postRoutes.studio(id, 'transition'), payload);
  },

  async remove(id: number): Promise<void> {
    await api.delete(postRoutes.studio(id));
  },
};
