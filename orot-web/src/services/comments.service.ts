import { api, toPaginatedResponse } from './api';
import { createAreaRoutes, apiPaths } from './api-routes';
import type {
  Comment,
  CommentListResponse,
  CommentQuery,
  CreateCommentPayload,
  ApiListPayload,
} from '@/types';

const commentRoutes = createAreaRoutes('comments');

function toCommentParams(query: CommentQuery) {
  const { status, ...rest } = query;

  if (status === 'approved') {
    return { ...rest, isApproved: true };
  }

  if (status === 'pending') {
    return { ...rest, isApproved: false, isFiltered: false };
  }

  if (status === 'filtered') {
    return { ...rest, isFiltered: true };
  }

  return rest;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export const publicCommentsService = {
  async getByPost(postId: number): Promise<Comment[]> {
    return api.get<Comment[]>(apiPaths.public('posts', postId, 'comments'));
  },

  async create(postId: number, payload: CreateCommentPayload): Promise<Comment> {
    return api.post<Comment>(
      apiPaths.public('posts', postId, 'comments'),
      payload,
    );
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioCommentsService = {
  async getAll(query: CommentQuery = {}): Promise<CommentListResponse> {
    const data = await api.get<
      ApiListPayload<CommentListResponse['data'][number]>
    >(
      commentRoutes.studio(),
      { params: toCommentParams(query) },
    );
    return toPaginatedResponse(data);
  },

  async approve(id: number): Promise<Comment> {
    return api.patch<Comment>(commentRoutes.studio(id, 'approve'));
  },

  async remove(id: number): Promise<void> {
    await api.delete(commentRoutes.studio(id));
  },
};
