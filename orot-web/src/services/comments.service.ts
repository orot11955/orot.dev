import {
  createResource,
  deleteResource,
  getResource,
  listResource,
  patchResource,
} from './service-helpers';
import { createAreaRoutes, apiPaths } from './api-routes';
import type {
  Comment,
  CommentListResponse,
  CommentQuery,
  CreateCommentPayload,
  CommentCountResponse
} from '@/types';

const commentRoutes = createAreaRoutes('comments');

function toCommentParams(query: CommentQuery) {
  const { status, ...rest } = query;
  if (status) return { ...rest, status };
  return rest;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicCommentsService = {
  async getByPost(postId: number): Promise<Comment[]> {
    return getResource<Comment[]>(apiPaths.public('posts', postId, 'comments'));
  },

  async countByPost(postId: number): Promise<number> {
    const result = await getResource<{ count: number }>(
      apiPaths.public('posts', postId, 'comments', 'count'),
    );

    return result.count;
  },

  async create(postId: number, payload: CreateCommentPayload): Promise<Comment> {
    return createResource<Comment, CreateCommentPayload>(
      apiPaths.public('posts', postId, 'comments'),
      payload,
    );
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioCommentsService = {
  async getAll(query: CommentQuery = {}): Promise<CommentListResponse> {
    return listResource<CommentListResponse['data'][number]>(
      commentRoutes.studio(),
      toCommentParams(query),
    );
  },

  async approve(id: number): Promise<Comment> {
    return patchResource<Comment>(commentRoutes.studio(id, 'approve'));
  },

  async remove(id: number): Promise<void> {
    await deleteResource(commentRoutes.studio(id));
  },
};
