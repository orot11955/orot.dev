import { BadRequestException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordVisit(data: {
    path: string;
    ip?: string;
    userAgent?: string;
    referer?: string;
  }) {
    return this.prisma.visitorStat.create({ data });
  }

  async recordPageVisit(req: Request, rawPath?: string, rawReferer?: string) {
    const path = rawPath?.trim();
    if (!path || !path.startsWith('/') || path.startsWith('/api')) {
      throw new BadRequestException('Invalid path');
    }

    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
      req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referer = rawReferer?.trim() || req.headers['referer'];

    return this.recordVisit({
      path,
      ip,
      userAgent,
      referer,
    });
  }

  async getStats() {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayVisitors, weekVisitors, monthVisitors, totalVisitors] =
      await Promise.all([
        this.prisma.visitorStat.count({
          where: { visitedAt: { gte: startOfToday } },
        }),
        this.prisma.visitorStat.count({
          where: { visitedAt: { gte: startOfWeek } },
        }),
        this.prisma.visitorStat.count({
          where: { visitedAt: { gte: startOfMonth } },
        }),
        this.prisma.visitorStat.count(),
      ]);

    // Top 5 posts by viewCount
    const topPosts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        publishedAt: true,
      },
    });

    // Daily visitor trend for last 14 days
    const trendDays = 14;
    const trendStart = new Date(now);
    trendStart.setDate(now.getDate() - (trendDays - 1));
    trendStart.setHours(0, 0, 0, 0);

    const rawVisits = await this.prisma.visitorStat.findMany({
      where: { visitedAt: { gte: trendStart } },
      select: { visitedAt: true },
    });

    const trendMap: Record<string, number> = {};
    for (let i = 0; i < trendDays; i++) {
      const d = new Date(trendStart);
      d.setDate(trendStart.getDate() + i);
      trendMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const v of rawVisits) {
      const key = v.visitedAt.toISOString().slice(0, 10);
      if (key in trendMap) trendMap[key]++;
    }

    const visitorTrend = Object.entries(trendMap).map(([date, count]) => ({
      date,
      count,
    }));

    // Post counts by status
    const postCounts = await this.prisma.post.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const postStats = postCounts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return {
      visitors: {
        today: todayVisitors,
        week: weekVisitors,
        month: monthVisitors,
        total: totalVisitors,
      },
      topPosts,
      visitorTrend,
      postStats,
    };
  }
}
