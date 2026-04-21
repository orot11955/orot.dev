import { createResource, getResource } from './service-helpers';
import { createAreaRoutes } from './api-routes';
import type { AnalyticsStats, PostStatus } from '@/types';

const analyticsRoutes = createAreaRoutes('analytics');

interface StudioAnalyticsPayload {
  visitors: AnalyticsStats['visitors'];
  topPosts: Array<AnalyticsStats['topPosts'][number] & { publishedAt?: string }>;
  visitorTrend: AnalyticsStats['dailyVisits'];
  postStats: Partial<Record<PostStatus, number>>;
}

const POST_STATUS_ORDER: PostStatus[] = [
  'DRAFT',
  'COMPLETED',
  'REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'UPDATED',
  'ARCHIVED',
];

// ─── Public (page visit tracking) ────────────────────────────────────────────

export const publicAnalyticsService = {
  async recordVisit(path: string, referer?: string): Promise<void> {
    await createResource(analyticsRoutes.public('visit'), { path, referer });
  },
};

// ─── Studio ───────────────────────────────────────────────────────────────────

export const studioAnalyticsService = {
  async getStats(): Promise<AnalyticsStats> {
    const data = await getResource<StudioAnalyticsPayload>(
      analyticsRoutes.studio('stats'),
    );

    return {
      visitors: data.visitors,
      topPosts: data.topPosts.map(({ id, title, slug, viewCount }) => ({
        id,
        title,
        slug,
        viewCount,
      })),
      dailyVisits: data.visitorTrend,
      postStatusDistribution: POST_STATUS_ORDER.map((status) => ({
        status,
        count: data.postStats[status] ?? 0,
      })),
    };
  },
};
