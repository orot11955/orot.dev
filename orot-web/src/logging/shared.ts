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

export type WebLogLevel = (typeof LOG_LEVELS)[number];

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
}

function fallbackId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
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

export function createRequestId(prefix = 'req'): string {
  const value =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : fallbackId();

  return `${prefix}_${value}`;
}

export function normalizeLogLevel(value?: string | null): WebLogLevel {
  if (value && LOG_LEVELS.includes(value as WebLogLevel)) {
    return value as WebLogLevel;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

export function serializeError(error: unknown): SerializedError | undefined {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;

    return {
      name: error.name,
      message: truncateString(error.message),
      stack: error.stack ? truncateString(error.stack) : undefined,
      cause: cause ? serializeError(cause) : undefined,
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
    message: truncateString(String(error)),
  };
}

export function sanitizeLogData(value: unknown, depth = 0): unknown {
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
      .map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) {
      return '[Truncated]';
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, itemValue]) => [
        key,
        isSensitiveKey(key)
          ? REDACTED_VALUE
          : sanitizeLogData(itemValue, depth + 1),
      ]),
    );
  }

  return truncateString(String(value));
}
