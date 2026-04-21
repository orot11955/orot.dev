import { NotFoundException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';

function createPrismaMock() {
  return {
    post: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  };
}

describe('PostsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: PostsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PostsService(prisma as unknown as PrismaService);
  });

  it('returns 404 when removing a missing post', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.post.delete).not.toHaveBeenCalled();
  });

  it('deletes a studio-visible post', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 12,
      status: PostStatus.PUBLISHED,
    });
    prisma.post.delete.mockResolvedValue({});

    await expect(service.remove(12)).resolves.toEqual({
      message: 'Post deleted',
    });
    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 12 } });
  });
});
