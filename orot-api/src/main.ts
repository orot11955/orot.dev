import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createLogger } from './logging/logger';
import { runWithRequestContext } from './logging/request-context';

const apiLogger = createLogger('orot-api');

function normalizeHeaderValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]?.trim();
  }

  return value?.trim();
}

function getClientIp(request: Request): string | undefined {
  const forwardedFor = normalizeHeaderValue(request.headers['x-forwarded-for']);
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }

  return request.ip || request.socket.remoteAddress;
}

function toDurationMs(startedAtNs: bigint): number {
  const elapsedNs = process.hrtime.bigint() - startedAtNs;
  return Number(elapsedNs) / 1_000_000;
}

function resolveRequestLogLevel(path: string, statusCode: number) {
  if (path === '/api/health' || path === '/health') {
    return 'debug' as const;
  }

  if (statusCode >= 400) {
    return 'warn' as const;
  }

  return 'info' as const;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);

  const configService = app.get(ConfigService);
  const allowedOrigins = Array.from(
    new Set(
      configService.get<string[]>('webOrigins') ?? ['http://localhost:3000'],
    ),
  );
  const httpLogging = configService.get<boolean>('httpLogging') ?? false;
  const requestBodyLimit =
    configService.get<string>('requestBodyLimit')?.trim() || '50mb';

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId =
      normalizeHeaderValue(req.header('x-request-id')) || randomUUID();
    const requestSource =
      normalizeHeaderValue(req.header('x-request-source')) || 'external';
    const clientSessionId = normalizeHeaderValue(
      req.header('x-client-session-id'),
    );
    const path = req.originalUrl ?? req.url;
    const startedAtNs = process.hrtime.bigint();
    const context = {
      requestId,
      source: 'http' as const,
      method: req.method,
      path,
      ip: getClientIp(req),
      userAgent: normalizeHeaderValue(req.header('user-agent')),
      requestSource,
      clientSessionId,
    };

    req.requestId = requestId;
    req.startedAtNs = startedAtNs;
    req.clientSessionId = clientSessionId;
    res.setHeader('X-Request-Id', requestId);

    runWithRequestContext(context, () => {
      let finished = false;

      res.on('finish', () => {
        finished = true;
        if (!httpLogging) {
          return;
        }

        runWithRequestContext(context, () => {
          apiLogger.log(
            resolveRequestLogLevel(path, res.statusCode),
            'http.request.completed',
            {
              statusCode: res.statusCode,
              durationMs: Number(toDurationMs(startedAtNs).toFixed(2)),
              contentLength: normalizeHeaderValue(
                res.getHeader('content-length')?.toString(),
              ),
            },
          );
        });
      });

      res.on('close', () => {
        if (finished || !httpLogging) {
          return;
        }

        runWithRequestContext(context, () => {
          apiLogger.warn('http.request.aborted', {
            statusCode: res.statusCode,
            durationMs: Number(toDurationMs(startedAtNs).toFixed(2)),
          });
        });
      });

      next();
    });
  });

  app.useBodyParser('json', { limit: requestBodyLimit });
  app.useBodyParser('urlencoded', {
    extended: true,
    limit: requestBodyLimit,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger (non-production only)
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('OROT API')
      .setDescription('OROT.DEV API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('port') ?? 4000;
  await app.listen(port);
  apiLogger.info('app.bootstrap.completed', {
    port,
    apiUrl: `http://localhost:${port}/api`,
    swaggerUrl: `http://localhost:${port}/api/docs`,
  });
}

void bootstrap();
