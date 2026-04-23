import { NotFoundException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createPostSearchText, PostsService } from './posts.service';

function createPrismaMock() {
  return {
    post: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  it('sets publishedAt on first publish', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 31,
      status: PostStatus.REVIEW,
      publishedAt: null,
    });
    prisma.post.update.mockResolvedValue({
      id: 31,
      status: PostStatus.PUBLISHED,
    });

    await service.transition(31, { status: PostStatus.PUBLISHED }, 'studio');

    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 31 },
        data: expect.objectContaining({
          status: PostStatus.PUBLISHED,
          publishedAt: expect.any(Date),
          scheduledAt: null,
        }),
      }),
    );
  });

  it('preserves publishedAt when publishing an edited post again', async () => {
    const publishedAt = new Date('2026-04-22T10:00:00.000Z');
    prisma.post.findUnique.mockResolvedValue({
      id: 32,
      status: PostStatus.REVIEW,
      publishedAt,
    });
    prisma.post.update.mockResolvedValue({
      id: 32,
      status: PostStatus.PUBLISHED,
      publishedAt,
    });

    await service.transition(32, { status: PostStatus.PUBLISHED }, 'studio');

    const updateArg = prisma.post.update.mock.calls[0][0];
    expect(updateArg).toEqual(
      expect.objectContaining({
        where: { id: 32 },
      }),
    );
    expect(updateArg.data).not.toHaveProperty('publishedAt');
  });

  it('finds global neighboring posts with targeted queries', async () => {
    const publishedAt = new Date('2026-04-22T10:00:00.000Z');
    const updatedAt = new Date('2026-04-22T10:30:00.000Z');
    const createdAt = new Date('2026-04-22T09:00:00.000Z');

    prisma.post.findUnique.mockResolvedValue({
      id: 12,
      slug: 'current-post',
      title: 'Current',
      status: PostStatus.PUBLISHED,
      seriesId: null,
      seriesOrder: null,
      publishedAt,
      updatedAt,
      createdAt,
      category: null,
      series: null,
    });
    prisma.post.findFirst
      .mockResolvedValueOnce({ id: 11, title: 'Prev', slug: 'prev-post' })
      .mockResolvedValueOnce({ id: 13, title: 'Next', slug: 'next-post' });

    const result = await service.findOneForArea('current-post', 'public');

    expect(result).toMatchObject({
      prev: { id: 11, title: 'Prev', slug: 'prev-post' },
      next: { id: 13, title: 'Next', slug: 'next-post' },
    });
    expect(prisma.post.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it('finds series neighbors by series order without loading the whole series', async () => {
    prisma.post.findUnique.mockResolvedValue({
      id: 22,
      slug: 'series-current',
      title: 'Series Current',
      status: PostStatus.PUBLISHED,
      seriesId: 3,
      seriesOrder: 2,
      publishedAt: new Date('2026-04-22T10:00:00.000Z'),
      updatedAt: new Date('2026-04-22T10:30:00.000Z'),
      createdAt: new Date('2026-04-22T09:00:00.000Z'),
      category: null,
      series: { id: 3, title: 'Series', slug: 'series' },
    });
    prisma.post.findFirst
      .mockResolvedValueOnce({
        id: 21,
        title: 'Series Prev',
        slug: 'series-prev',
      })
      .mockResolvedValueOnce({
        id: 23,
        title: 'Series Next',
        slug: 'series-next',
      });

    const result = await service.findOneForArea('series-current', 'public');

    expect(result).toMatchObject({
      prev: { id: 21, title: 'Series Prev', slug: 'series-prev' },
      next: { id: 23, title: 'Series Next', slug: 'series-next' },
    });
    expect(prisma.post.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it('caches published tags until invalidated', async () => {
    prisma.post.findMany.mockResolvedValue([{ tags: 'alpha, beta' }]);

    await expect(service.getAllTags()).resolves.toEqual(['alpha', 'beta']);
    await expect(service.getAllTags()).resolves.toEqual(['alpha', 'beta']);

    expect(prisma.post.findMany).toHaveBeenCalledTimes(1);

    service.invalidatePublicTagCache();

    await expect(service.getAllTags()).resolves.toEqual(['alpha', 'beta']);
    expect(prisma.post.findMany).toHaveBeenCalledTimes(2);
  });

  it('searches posts across visible card metadata', async () => {
    prisma.post.count.mockResolvedValue(0);
    prisma.post.findMany.mockResolvedValue([]);

    await service.findAll({ search: ' react ' }, 'public');

    const expectedWhere = {
      status: PostStatus.PUBLISHED,
      OR: [
        { title: { contains: 'react' } },
        { slug: { contains: 'react' } },
        { searchText: { contains: 'react' } },
        { excerpt: { contains: 'react' } },
        { tags: { contains: 'react' } },
        { series: { is: { title: { contains: 'react' } } } },
        { series: { is: { slug: { contains: 'react' } } } },
        { category: { is: { name: { contains: 'react' } } } },
        { category: { is: { slug: { contains: 'react' } } } },
      ],
    };

    expect(prisma.post.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
  });

  it('builds searchable post text without embedded image payloads', () => {
    const searchText = createPostSearchText(
      [
        'Intro react text',
        '![Architecture](data:image/png;base64,AAAagsBBB==)',
        '<img src="data:image/png;base64,CCCagsDDD==" alt="Inline diagram" />',
        '[Docs](https://example.com/ags)',
      ].join('\n'),
    );

    expect(searchText).toBe(
      'Intro react text Architecture Inline diagram Docs',
    );
    expect(searchText).not.toContain('ags');
    expect(searchText).not.toContain('data:image');
  });
});
