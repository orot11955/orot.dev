import 'server-only';

import {
  normalizeLogLevel,
  sanitizeLogData,
  serializeError,
  type WebLogLevel,
} from './shared';

function shouldLog(level: WebLogLevel): boolean {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return false;
  }

  const configuredLevel = normalizeLogLevel(
    process.env.WEB_LOG_LEVEL?.trim().toLowerCase() ??
      process.env.LOG_LEVEL?.trim().toLowerCase(),
  );
  const weights: Record<WebLogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  return weights[level] >= weights[configuredLevel];
}

function writeLog(level: WebLogLevel, entry: Record<string, unknown>) {
  const payload =
    (process.env.WEB_LOG_PRETTY ?? process.env.LOG_PRETTY) === 'true'
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

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

export const webServerLogger = {
  log(
    level: WebLogLevel,
    event: string,
    meta?: Record<string, unknown>,
    error?: unknown,
  ) {
    if (!shouldLog(level)) {
      return;
    }

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: 'orot-web',
      runtime: 'node',
      event,
    };

    if (meta) {
      if (typeof meta.requestId === 'string') {
        entry.requestId = meta.requestId;
      }
      if (typeof meta.apiRequestId === 'string') {
        entry.apiRequestId = meta.apiRequestId;
      }
      if (typeof meta.method === 'string') {
        entry.method = meta.method;
      }
      if (typeof meta.path === 'string') {
        entry.path = meta.path;
      }

      entry.meta = sanitizeLogData(meta);
    }

    const serializedError = serializeError(error);
    if (serializedError) {
      entry.error = serializedError;
    }

    writeLog(level, entry);
  },

  debug(event: string, meta?: Record<string, unknown>) {
    this.log('debug', event, meta);
  },

  info(event: string, meta?: Record<string, unknown>) {
    this.log('info', event, meta);
  },

  warn(event: string, meta?: Record<string, unknown>, error?: unknown) {
    this.log('warn', event, meta, error);
  },

  error(event: string, error?: unknown, meta?: Record<string, unknown>) {
    this.log('error', event, meta, error);
  },
};
