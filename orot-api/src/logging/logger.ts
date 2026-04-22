import { inspect } from 'util';
import { getRequestContext } from './request-context';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
const MAX_STRING_LENGTH = 600;
const MAX_ARRAY_LENGTH = 20;
const MAX_DEPTH = 4;
const REDACTED_VALUE = '[Redacted]';
const SENSITIVE_KEY_FRAGMENTS = [
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
  'set-cookie',
];

export type LogLevel = (typeof LOG_LEVELS)[number];

function normalizeLogLevel(value?: string | null): LogLevel {
  if (value && LOG_LEVELS.includes(value as LogLevel)) {
    return value as LogLevel;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const configuredLevel = normalizeLogLevel(
    process.env.API_LOG_LEVEL?.trim().toLowerCase() ??
      process.env.LOG_LEVEL?.trim().toLowerCase(),
  );
  const weights: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  return weights[level] >= weights[configuredLevel];
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.trim().toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
    normalizedKey.includes(fragment),
  );
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...`;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncateString(error.message),
      stack: error.stack ? truncateString(error.stack) : undefined,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: truncateString(error),
    };
  }

  if (error === null || error === undefined) {
    return undefined;
  }

  return {
    name: 'Error',
    message: truncateString(inspect(error, { depth: 3, breakLength: 120 })),
  };
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) {
      return '[Truncated]';
    }

    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, itemValue]) => [
        key,
        isSensitiveKey(key)
          ? REDACTED_VALUE
          : sanitizeValue(itemValue, depth + 1),
      ],
    );

    return Object.fromEntries(entries);
  }

  return truncateString(inspect(value, { depth: 1, breakLength: 120 }));
}

function writeLog(level: LogLevel, entry: Record<string, unknown>) {
  const payload =
    (process.env.API_LOG_PRETTY ?? process.env.LOG_PRETTY) === 'true'
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

export function createLogger(service: string) {
  const log = (
    level: LogLevel,
    event: string,
    meta?: Record<string, unknown>,
    error?: unknown,
  ) => {
    if (!shouldLog(level)) {
      return;
    }

    const context = getRequestContext();
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service,
      runtime: 'node',
      event,
    };

    if (context?.requestId) {
      entry.requestId = context.requestId;
    }
    if (context?.source) {
      entry.source = context.source;
    }
    if (context?.requestSource) {
      entry.requestSource = context.requestSource;
    }
    if (context?.jobName) {
      entry.jobName = context.jobName;
    }
    if (context?.userId !== undefined) {
      entry.userId = context.userId;
    }
    if (context?.userRole) {
      entry.userRole = context.userRole;
    }
    if (context?.method) {
      entry.method = context.method;
    }
    if (context?.path) {
      entry.path = context.path;
    }
    if (context?.ip) {
      entry.ip = context.ip;
    }
    if (context?.userAgent) {
      entry.userAgent = context.userAgent;
    }
    if (context?.clientSessionId) {
      entry.clientSessionId = context.clientSessionId;
    }

    if (meta) {
      entry.meta = sanitizeValue(meta);
    }

    const serializedError = serializeError(error);
    if (serializedError) {
      entry.error = serializedError;
    }

    writeLog(level, entry);
  };

  return {
    log,

    debug(event: string, meta?: Record<string, unknown>) {
      log('debug', event, meta);
    },

    info(event: string, meta?: Record<string, unknown>) {
      log('info', event, meta);
    },

    warn(event: string, meta?: Record<string, unknown>, error?: unknown) {
      log('warn', event, meta, error);
    },

    error(event: string, error?: unknown, meta?: Record<string, unknown>) {
      log('error', event, meta, error);
    },
  };
}
