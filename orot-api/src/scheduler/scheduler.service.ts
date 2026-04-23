import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';
import { createLogger } from '../logging/logger';
import { runWithRequestContext } from '../logging/request-context';
import { PostsService } from '../posts/posts.service';

const schedulerLogger = createLogger('orot-api');
const PUBLISH_JOB_NAME = 'publishScheduledPosts';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
  ) {}

  /**
   * Every minute: publish posts whose scheduledAt has passed
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledPosts() {
    return runWithRequestContext(
      {
        requestId: `job_${randomUUID()}`,
        source: 'job',
        jobName: PUBLISH_JOB_NAME,
      },
      async () => {
        const now = new Date();

        const due = await this.prisma.post.findMany({
          where: {
            status: PostStatus.SCHEDULED,
            scheduledAt: { lte: now },
          },
          select: { id: true, title: true, publishedAt: true },
        });

        if (due.length === 0) {
          schedulerLogger.debug('scheduler.publish.noop');
          return;
        }

        schedulerLogger.info('scheduler.publish.started', {
          dueCount: due.length,
        });

        let publishedCount = 0;

        for (const post of due) {
          try {
            await this.prisma.post.update({
              where: { id: post.id },
              data: {
                status: PostStatus.PUBLISHED,
                publishedAt: post.publishedAt ?? now,
                scheduledAt: null,
              },
            });
            publishedCount += 1;

            schedulerLogger.info('scheduler.post_published', {
              postId: post.id,
              title: post.title,
            });
          } catch (error) {
            schedulerLogger.error('scheduler.post_publish.failed', error, {
              postId: post.id,
              title: post.title,
            });
          }
        }

        if (publishedCount > 0) {
          this.postsService.invalidatePublicTagCache();
        }

        schedulerLogger.info('scheduler.publish.completed', {
          dueCount: due.length,
          publishedCount,
        });
      },
    );
  }
}
