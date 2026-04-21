import {
  createResource,
  deleteResource,
  getResource,
  listResource,
  patchResource,
  uploadImageResource,
} from './service-helpers';
import { apiPaths, createAreaRoutes } from './api-routes';
import type {
  Post,
  PostDetail,
  PostListResponse,
  PostQuery,
  CreatePostPayload,
  UpdatePostPayload,
  TransitionPostPayload,
} from '@/types';
import { normalizePostQuery } from '@/utils/post-query';
import { normalizeSlugParam } from '@/utils/slug';

const postRoutes = createAreaRoutes('posts');

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicPostsService = {
  async getAll(query: PostQuery = {}): Promise<PostListResponse> {
    return listResource<PostListResponse['data'][number]>(
      postRoutes.public(),
      normalizePostQuery(query),
    );
  },

  async getBySlug(slug: string): Promise<PostDetail> {
    return getResource<PostDetail>(postRoutes.public(normalizeSlugParam(slug)));
  },

  async recordView(
    slug: string,
  ): Promise<{ viewCount: number; counted: boolean }> {
    return createResource(postRoutes.public(normalizeSlugParam(slug), 'view'));
  },

  async getAllTags(): Promise<string[]> {
    return getResource<string[]>(postRoutes.public('tags'));
  },
};

// ─── Editor ───────────────────────────────────────────────────────────────────

export const editorPostsService = {
  async create(payload: CreatePostPayload): Promise<Post> {
    return createResource<Post, CreatePostPayload>(postRoutes.editor(), payload);
  },

  async getAll(query: PostQuery = {}): Promise<PostListResponse> {
    return listResource<PostListResponse['data'][number]>(
      postRoutes.editor(),
      normalizePostQuery(query),
    );
  },

  async getById(id: number): Promise<Post> {
    return getResource<Post>(postRoutes.editor(id));
  },

  async update(id: number, payload: UpdatePostPayload): Promise<Post> {
    return patchResource<Post, UpdatePostPayload>(postRoutes.editor(id), payload);
  },

  async uploadCoverImage(id: number, file: File): Promise<Post> {
    return uploadImageResource<Post>(postRoutes.editor(id, 'cover-image'), file);
  },

  async removeCoverImage(id: number): Promise<Post> {
    return deleteResource<Post>(postRoutes.editor(id, 'cover-image'));
  },

  async transition(
    id: number,
    payload: TransitionPostPayload,
  ): Promise<Post> {
    return patchResource<Post, TransitionPostPayload>(
      postRoutes.editor(id, 'transition'),
      payload,
    );
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioPostsService = {
  async getAll(query: PostQuery = {}): Promise<PostListResponse> {
    return listResource<PostListResponse['data'][number]>(
      postRoutes.studio(),
      normalizePostQuery(query),
    );
  },

  async getById(id: number): Promise<Post> {
    return getResource<Post>(postRoutes.studio(id));
  },

  async getBySlug(slug: string): Promise<PostDetail> {
    return getResource<PostDetail>(
      apiPaths.studio('posts', 'slug', normalizeSlugParam(slug)),
    );
  },

  async update(id: number, payload: UpdatePostPayload): Promise<Post> {
    return patchResource<Post, UpdatePostPayload>(postRoutes.studio(id), payload);
  },

  async transition(
    id: number,
    payload: TransitionPostPayload,
  ): Promise<Post> {
    return patchResource<Post, TransitionPostPayload>(
      postRoutes.studio(id, 'transition'),
      payload,
    );
  },

  async remove(id: number): Promise<void> {
    await deleteResource(postRoutes.studio(id));
  },
};
