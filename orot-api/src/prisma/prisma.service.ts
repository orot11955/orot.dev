import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from './prisma-adapter';
import { createLogger } from '../logging/logger';

const prismaLogger = createLogger('orot-api');

type PrismaEventClient = PrismaClient & {
  $on(eventType: 'query', callback: (event: Prisma.QueryEvent) => void): void;
  $on(eventType: 'warn', callback: (event: Prisma.LogEvent) => void): void;
  $on(eventType: 'error', callback: (event: Prisma.LogEvent) => void): void;
};

function resolveSlowQueryMs(): number {
  const parsed = Number.parseInt(
    process.env.API_SLOW_QUERY_MS || process.env.SLOW_QUERY_MS || '300',
    10,
  );
  return Number.isFinite(parsed) ? parsed : 300;
}

function truncateQuery(query: string): string {
  const normalized = query.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 400) {
    return normalized;
  }

  return `${normalized.slice(0, 400)}...`;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: createPrismaAdapter(),
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    const slowQueryMs = resolveSlowQueryMs();
    const eventClient = this as PrismaEventClient;

    eventClient.$on('query', (event: Prisma.QueryEvent) => {
      if (event.duration < slowQueryMs) {
        return;
      }

      prismaLogger.warn('db.slow_query', {
        durationMs: event.duration,
        target: event.target,
        query: truncateQuery(event.query),
        paramsLength: event.params.length,
      });
    });

    eventClient.$on('warn', (event: Prisma.LogEvent) => {
      prismaLogger.warn('db.client_warn', {
        message: event.message,
        target: event.target,
        timestamp: event.timestamp,
      });
    });

    eventClient.$on('error', (event: Prisma.LogEvent) => {
      prismaLogger.error('db.client_error', new Error(event.message), {
        target: event.target,
        timestamp: event.timestamp,
      });
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
