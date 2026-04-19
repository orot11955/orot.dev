import { NextResponse } from 'next/server';
import { createRequestId, type WebLogLevel } from '@/logging/shared';
import { webServerLogger } from '@/logging/server';

const MAX_BODY_SIZE = 32_000;
const ALLOWED_LEVELS = new Set<WebLogLevel>([
  'debug',
  'info',
  'warn',
  'error',
]);

function getHeaderValue(request: Request, name: string): string | undefined {
  return request.headers.get(name)?.trim() || undefined;
}

function responseWithRequestId(status: number, requestId: string) {
  return new NextResponse(null, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
  });
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = getHeaderValue(request, 'x-request-id') ?? createRequestId('log');
  const loggingEnabled =
    process.env.CLIENT_ERROR_LOGGING !== 'false' &&
    process.env.NEXT_PUBLIC_CLIENT_ERROR_LOGGING !== 'false';

  if (!loggingEnabled) {
    return responseWithRequestId(204, requestId);
  }

  let rawBody = '';

  try {
    rawBody = await request.text();
  } catch (error) {
    webServerLogger.warn(
      'client.log.read_failed',
      { requestId },
      error,
    );
    return responseWithRequestId(400, requestId);
  }

  if (rawBody.length > MAX_BODY_SIZE) {
    webServerLogger.warn('client.log.rejected', {
      requestId,
      reason: 'payload_too_large',
      size: rawBody.length,
    });
    return responseWithRequestId(413, requestId);
  }

  let payload: Record<string, unknown> = {};

  try {
    payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch (error) {
    webServerLogger.warn(
      'client.log.invalid_json',
      { requestId },
      error,
    );
    return responseWithRequestId(400, requestId);
  }

  const reportedLevel =
    typeof payload.level === 'string' && ALLOWED_LEVELS.has(payload.level as WebLogLevel)
      ? (payload.level as WebLogLevel)
      : 'warn';
  const clientEvent =
    typeof payload.event === 'string' ? payload.event : 'client.runtime';
  const meta =
    typeof payload.meta === 'object' && payload.meta !== null
      ? (payload.meta as Record<string, unknown>)
      : undefined;
  const error =
    typeof payload.error === 'object' && payload.error !== null
      ? payload.error
      : undefined;

  webServerLogger.log(reportedLevel, 'client.log.received', {
    requestId,
    clientEvent,
    clientEventId:
      typeof payload.eventId === 'string' ? payload.eventId : requestId,
    clientRequestId:
      typeof payload.requestId === 'string' ? payload.requestId : undefined,
    apiRequestId:
      typeof payload.apiRequestId === 'string'
        ? payload.apiRequestId
        : undefined,
    sessionId:
      typeof payload.sessionId === 'string'
        ? payload.sessionId
        : getHeaderValue(request, 'x-client-session-id'),
    pageUrl:
      typeof payload.pageUrl === 'string' ? payload.pageUrl : undefined,
    path: typeof payload.path === 'string' ? payload.path : undefined,
    referrer:
      typeof payload.referrer === 'string' ? payload.referrer : undefined,
    userAgent: getHeaderValue(request, 'user-agent'),
    clientMeta: meta,
  }, error);

  return responseWithRequestId(204, requestId);
}
