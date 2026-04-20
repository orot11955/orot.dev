import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';

// Default filter keywords (can be extended via SiteSetting)
const DEFAULT_FILTER_KEYWORDS = ['스팸', 'spam', '광고', 'advertisement'];
type PublicComment = {
  id: number;
  postId: number;
  parentId: number | null;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'APPROVED' | 'PENDING' | 'FILTERED';
  createdAt: Date;
  updatedAt: Date;
};
type PublicCommentTree = PublicComment & { replies: PublicCommentTree[] };

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) { }

  private async getFilterKeywords(): Promise<string[]> {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: 'filter_keywords' },
    });

    if (!setting) return DEFAULT_FILTER_KEYWORDS;

    return setting.value
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }

  async create(postId: number, dto: CreateCommentDto) {
    // Public comments are only available for published posts.
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== 'PUBLISHED')
      throw new NotFoundException('Post not found');

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, postId: true },
      });
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const keywords = await this.getFilterKeywords();
    const lowerContent = dto.content.toLowerCase();
    const isFiltered = keywords.some((kw) =>
      lowerContent.includes(kw.toLowerCase()),
    );
    const status = isFiltered ? 'PENDING' : 'APPROVED';

    return this.prisma.comment.create({
      data: {
        postId,
        parentId: dto.parentId,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        content: dto.content,
        status,
      },
    });
  }

  async findByPost(postId: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== 'PUBLISHED')
      throw new NotFoundException('Post not found');

    const comments = await this.prisma.comment.findMany({
      where: { postId, status: 'APPROVED' },
      orderBy: { createdAt: 'asc' },
    });

    return this.buildCommentTree(comments);
  }

  async findAll(query: QueryCommentDto) {
    const { page = 1, limit = 20, postId, status } = query;
    const skip = (page - 1) * limit;

    const where: {
      postId?: number;
      status?: 'APPROVED' | 'PENDING' | 'FILTERED';
    } = {};
    if (postId !== undefined) where.postId = postId;
    if (status !== undefined) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: { select: { id: true, title: true, slug: true } },
          parent: { select: { id: true, authorName: true } },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approve(id: number) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.comment.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async remove(id: number) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted' };
  }

  private buildCommentTree(comments: PublicComment[]): PublicCommentTree[] {
    const map = new Map<number, PublicCommentTree>();
    const roots: PublicCommentTree[] = [];

    comments.forEach((comment) => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach((comment) => {
      const node = map.get(comment.id);
      if (!node) return;

      if (comment.parentId) {
        const parent = map.get(comment.parentId);
        if (parent) {
          parent.replies.push(node);
        }
        return;
      }

      roots.push(node);
    });

    return roots;
  }
}
