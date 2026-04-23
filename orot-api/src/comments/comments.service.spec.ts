import { NotFoundException } from '@nestjs/common';
import { CommentStatus, PostStatus } from '@prisma/client';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

function createPrismaMock() {
  return {
    siteSetting: {
      findUnique: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('CommentsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: CommentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CommentsService(prisma as unknown as PrismaService);
  });

  it('blocks comments on unpublished posts', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 3,
      status: PostStatus.DRAFT,
    });

    await expect(
      service.create(3, {
        authorName: 'tester',
        authorEmail: 'tester@example.com',
        content: 'hello',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks keyword-matched comments as pending approval', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 5,
      status: PostStatus.PUBLISHED,
    });
    prisma.siteSetting.findUnique.mockResolvedValue({
      key: 'filter_keywords',
      value: 'spam,광고',
    });
    prisma.comment.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => Promise.resolve(data),
    );

    const result = await service.create(5, {
      authorName: 'tester',
      authorEmail: 'tester@example.com',
      content: 'this looks like spam',
    });

    expect(result).toMatchObject({
      postId: 5,
      status: CommentStatus.PENDING,
    });
  });

  it('loads all approved comments for a post in ascending order', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 7,
      status: PostStatus.PUBLISHED,
    });
    prisma.comment.findMany.mockResolvedValue([]);

    await service.findByPost(7);

    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { postId: 7, status: CommentStatus.APPROVED },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('returns approved comments as a nested tree', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 9,
      status: PostStatus.PUBLISHED,
    });
    prisma.comment.findMany.mockResolvedValue([
      {
        id: 1,
        postId: 9,
        parentId: null,
        authorName: 'root',
        authorEmail: 'root@example.com',
        content: 'root',
        status: CommentStatus.APPROVED,
        createdAt: new Date('2026-04-19T00:00:00.000Z'),
        updatedAt: new Date('2026-04-19T00:00:00.000Z'),
      },
      {
        id: 2,
        postId: 9,
        parentId: 1,
        authorName: 'reply',
        authorEmail: 'reply@example.com',
        content: 'reply',
        status: CommentStatus.APPROVED,
        createdAt: new Date('2026-04-19T00:01:00.000Z'),
        updatedAt: new Date('2026-04-19T00:01:00.000Z'),
      },
      {
        id: 3,
        postId: 9,
        parentId: 2,
        authorName: 'reply-2',
        authorEmail: 'reply-2@example.com',
        content: 'reply-2',
        status: CommentStatus.APPROVED,
        createdAt: new Date('2026-04-19T00:02:00.000Z'),
        updatedAt: new Date('2026-04-19T00:02:00.000Z'),
      },
    ]);

    const result = await service.findByPost(9);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].id).toBe(2);
    expect(result[0].replies[0].replies).toHaveLength(1);
    expect(result[0].replies[0].replies[0].id).toBe(3);
  });

  it('applies studio search before pagination', async () => {
    prisma.comment.count.mockResolvedValue(0);
    prisma.comment.findMany.mockResolvedValue([]);

    await service.findAll({
      search: 'hello',
      page: 2,
      limit: 5,
    });

    const expectedWhere = {
      OR: [
        { content: { contains: 'hello' } },
        { authorName: { contains: 'hello' } },
        { authorEmail: { contains: 'hello' } },
        { post: { title: { contains: 'hello' } } },
      ],
    };

    expect(prisma.comment.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 5,
        take: 5,
      }),
    );
  });
});
