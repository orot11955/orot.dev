import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { createLogger } from '../logging/logger';

// Routes to skip tracking (assets, health, auth, studio, docs)
const SKIP_PATTERNS = [
  /^\/api\/auth\//,
  /^\/api\/studio\//,
  /^\/api\/docs/,
  /^\/uploads\//,
  /\.(ico|png|jpg|svg|css|js|map|woff|ttf)$/,
];

const analyticsLogger = createLogger('orot-api');

@Injectable()
export class VisitorMiddleware implements NestMiddleware {
  constructor(private readonly analyticsService: AnalyticsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const path = req.originalUrl ?? req.url;

    const shouldSkip = SKIP_PATTERNS.some((pattern) => pattern.test(path));
    if (!shouldSkip) {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const referer = req.headers['referer'];

      // Fire-and-forget, no await needed
      this.analyticsService
        .recordVisit({
          path,
          ip,
          userAgent,
          referer,
        })
        .catch((error) => {
          analyticsLogger.warn(
            'analytics.visit_record_failed',
            { path, referer },
            error,
          );
        });
    }

    next();
  }
}
