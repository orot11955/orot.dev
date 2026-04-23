import { PostStatus } from '@prisma/client';
import { PostsService } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulerService } from './scheduler.service';

function createPrismaMock() {
  return {
    post: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('SchedulerService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let postsService: Pick<PostsService, 'invalidatePublicTagCache'>;
  let service: SchedulerService;

  beforeEach(() => {
    prisma = createPrismaMock();
    postsService = {
      invalidatePublicTagCache: jest.fn(),
    };
    service = new SchedulerService(
      prisma as unknown as PrismaService,
      postsService as PostsService,
    );
  });

  it('preserves publishedAt when publishing a scheduled update', async () => {
    const publishedAt = new Date('2026-04-22T10:00:00.000Z');
    prisma.post.findMany.mockResolvedValue([
      {
        id: 41,
        title: 'Already published',
        publishedAt,
      },
    ]);
    prisma.post.update.mockResolvedValue({});

    await service.publishScheduledPosts();

    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt,
        scheduledAt: null,
      },
    });
    expect(postsService.invalidatePublicTagCache).toHaveBeenCalledTimes(1);
  });
});
