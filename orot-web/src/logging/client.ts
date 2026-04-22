import {
  createRequestId,
  sanitizeLogData,
  serializeError,
  type WebLogLevel,
} from './shared';

const CLIENT_LOG_ENDPOINT = '/api/client-logs';
const CLIENT_SESSION_STORAGE_KEY = 'orot:client-session-id';

interface ClientLogMeta extends Record<string, unknown> {
  requestId?: string;
  apiRequestId?: string;
}

interface ClientLogPayload {
  timestamp: string;
  level: WebLogLevel;
  service: 'orot-web';
  runtime: 'browser';
  event: string;
  eventId: string;
  sessionId?: string;
  requestId?: string;
  apiRequestId?: string;
  pageUrl?: string;
  path?: string;
  referrer?: string;
  userAgent?: string;
  meta?: unknown;
  error?: ReturnType<typeof serializeError>;
}

function shouldShipClientLog(): boolean {
  return process.env.NEXT_PUBLIC_CLIENT_ERROR_LOGGING !== 'false';
}

function getBrowserMetadata() {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    pageUrl: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
  };
}

export function getClientSessionId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const existing = window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated = createRequestId('sess');
    window.sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

function writeConsole(level: WebLogLevel, entry: ClientLogPayload) {
  const payload = JSON.stringify(entry);

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

function shipClientLog(entry: ClientLogPayload) {
  const body = JSON.stringify(entry);

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    const sent = navigator.sendBeacon(
      CLIENT_LOG_ENDPOINT,
      new Blob([body], { type: 'application/json' }),
    );

    if (sent) {
      return;
    }
  }

  void fetch(CLIENT_LOG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': entry.eventId,
      'X-Request-Source': 'orot-web:browser-log',
      ...(entry.sessionId
        ? { 'X-Client-Session-Id': entry.sessionId }
        : {}),
    },
    body,
    cache: 'no-store',
    keepalive: true,
  }).catch(() => undefined);
}

function createPayload(
  level: WebLogLevel,
  event: string,
  meta?: ClientLogMeta,
  error?: unknown,
): ClientLogPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const { requestId, apiRequestId, ...restMeta } = meta ?? {};

  return {
    timestamp: new Date().toISOString(),
    level,
    service: 'orot-web',
    runtime: 'browser',
    event,
    eventId: createRequestId('evt'),
    sessionId: getClientSessionId(),
    requestId,
    apiRequestId,
    ...getBrowserMetadata(),
    meta: Object.keys(restMeta).length > 0 ? sanitizeLogData(restMeta) : undefined,
    error: serializeError(error),
  };
}

function log(
  level: WebLogLevel,
  event: string,
  meta?: ClientLogMeta,
  error?: unknown,
) {
  const payload = createPayload(level, event, meta, error);
  if (!payload) {
    return;
  }

  if (process.env.NODE_ENV !== 'production' || level === 'warn' || level === 'error') {
    writeConsole(level, payload);
  }

  if ((level === 'warn' || level === 'error') && shouldShipClientLog()) {
    shipClientLog(payload);
  }
}

export const webClientLogger = {
  log,

  debug(event: string, meta?: ClientLogMeta) {
    log('debug', event, meta);
  },

  info(event: string, meta?: ClientLogMeta) {
    log('info', event, meta);
  },

  warn(event: string, meta?: ClientLogMeta, error?: unknown) {
    log('warn', event, meta, error);
  },

  error(event: string, error?: unknown, meta?: ClientLogMeta) {
    log('error', event, meta, error);
  },
};
