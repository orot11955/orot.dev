import { BadRequestException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SeriesService } from './series.service';

function createPrismaMock() {
  return {
    series: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('SeriesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SeriesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SeriesService(prisma as unknown as PrismaService);
  });

  it('falls back to the default slug when a title normalizes to empty', async () => {
    prisma.series.findUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null);
    prisma.series.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => Promise.resolve(data),
    );

    const result = await service.create({
      title: '!!!',
    });

    expect(result).toMatchObject({
      title: '!!!',
      slug: 'series-1',
    });
  });

  it('rejects series assignment when requested post ids are missing', async () => {
    prisma.series.findUnique.mockResolvedValue({ id: 7, posts: [] });
    prisma.post.findMany.mockResolvedValue([
      { id: 10, status: PostStatus.PUBLISHED },
    ]);

    await expect(
      service.assignPosts(7, { postIds: [10, 11] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates series assignments inside a transaction', async () => {
    const tx = {
      post: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    prisma.series.findUnique.mockResolvedValue({ id: 7, posts: [] });
    prisma.post.findMany.mockResolvedValue([
      { id: 10, status: PostStatus.PUBLISHED },
      { id: 11, status: PostStatus.PUBLISHED },
    ]);
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await service.assignPosts(7, { postIds: [10, 11] });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.post.updateMany).toHaveBeenCalledWith({
      where: { seriesId: 7, id: { notIn: [10, 11] } },
      data: { seriesId: null, seriesOrder: null },
    });
    expect(tx.post.update).toHaveBeenCalledTimes(2);
  });
});
