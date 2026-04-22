import { resolvePublicApiOrigin } from './api-origin';

const DEFAULT_ERROR_MESSAGE = '요청을 처리하지 못했습니다.';
const SERVER_ERROR_MESSAGE =
  '서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
const NETWORK_ERROR_MESSAGE =
  '서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.';
const DATABASE_CONFIG_ERROR_MESSAGE =
  '데이터베이스 연결 정보가 올바르지 않습니다. 설정을 확인해주세요.';
const DATABASE_CONNECTION_ERROR_MESSAGE =
  '데이터베이스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.';

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function hasInternalErrorDetails(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    /(?:^|\s)p\d{4}(?:\s|$|:)/i.test(value) ||
    normalized.includes('prisma') ||
    normalized.includes('database url') ||
    normalized.includes('database string') ||
    normalized.includes('request failed with status code') ||
    normalized.includes('invalid `prisma.') ||
    normalized.includes('sqlstate') ||
    normalized.includes('adapter') ||
    normalized.includes('econn')
  );
}

function fallbackMessageByStatus(statusCode?: number): string | null {
  switch (statusCode) {
    case 400:
      return '요청 내용을 다시 확인해주세요.';
    case 401:
      return '로그인이 필요합니다.';
    case 403:
      return '이 작업을 수행할 권한이 없습니다.';
    case 404:
      return '요청한 데이터를 찾을 수 없습니다.';
    case 409:
      return '이미 처리되었거나 중복된 요청입니다.';
    case 413:
      return '전송한 데이터가 너무 큽니다. 업로드 파일 크기나 개수를 줄여 다시 시도해주세요.';
    case 422:
      return '입력한 내용을 다시 확인해주세요.';
    case 429:
      return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    default:
      return statusCode && statusCode >= 500 ? SERVER_ERROR_MESSAGE : null;
  }
}

function resolveFriendlyMessage(
  rawMessage: string,
  statusCode?: number,
  errorName?: string | null,
  errorCode?: string | null,
): string {
  const message = normalizeWhitespace(rawMessage);

  if (!message) {
    return fallbackMessageByStatus(statusCode) ?? DEFAULT_ERROR_MESSAGE;
  }

  const normalized = message.toLowerCase();
  const context = [normalized, errorName?.toLowerCase(), errorCode?.toLowerCase()]
    .filter(Boolean)
    .join(' ');

  if (
    context.includes('p1013') ||
    normalized.includes('provided database string is invalid') ||
    normalized.includes('database string is invalid') ||
    normalized.includes('invalid port number in database url') ||
    normalized.includes('database_url is required')
  ) {
    return DATABASE_CONFIG_ERROR_MESSAGE;
  }

  if (
    context.includes('p1000') ||
    context.includes('p1001') ||
    context.includes('p1002') ||
    context.includes('p1008') ||
    context.includes('p1017') ||
    normalized.includes("can't reach database") ||
    normalized.includes('cant reach database') ||
    normalized.includes('unable to reach database') ||
    normalized.includes('prismaclientinitializationerror') ||
    normalized.includes('database server')
  ) {
    return DATABASE_CONNECTION_ERROR_MESSAGE;
  }

  if (
    context.includes('p2002') ||
    normalized.includes('unique constraint failed')
  ) {
    return '이미 사용 중인 값입니다. 다른 값을 입력해주세요.';
  }

  if (
    context.includes('p2003') ||
    normalized.includes('foreign key constraint failed')
  ) {
    return '관련된 데이터가 있어 요청을 처리할 수 없습니다.';
  }

  if (
    context.includes('p2025') ||
    normalized.includes('record to update not found') ||
    normalized.includes('record to delete does not exist')
  ) {
    return '요청한 데이터를 찾을 수 없습니다.';
  }

  if (
    statusCode === 413 ||
    normalized.includes('payload too large') ||
    normalized.includes('request entity too large')
  ) {
    return '전송한 데이터가 너무 큽니다. 업로드 파일 크기나 개수를 줄여 다시 시도해주세요.';
  }

  if (
    normalized.includes('network error') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('load failed') ||
    context.includes('err_network') ||
    context.includes('econnrefused') ||
    context.includes('enotfound') ||
    context.includes('econnaborted')
  ) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (normalized === 'invalid credentials') {
    return '아이디 또는 비밀번호가 올바르지 않습니다.';
  }

  if (
    normalized === 'unauthorized' ||
    normalized === 'unauthorized exception'
  ) {
    return '로그인이 필요합니다.';
  }

  if (
    normalized === 'forbidden' ||
    normalized === 'forbidden resource'
  ) {
    return '이 작업을 수행할 권한이 없습니다.';
  }

  if (normalized.includes('post not found')) {
    return '요청한 글을 찾을 수 없습니다.';
  }

  if (normalized.includes('series not found')) {
    return '요청한 시리즈를 찾을 수 없습니다.';
  }

  if (normalized.includes('gallery item not found')) {
    return '요청한 이미지를 찾을 수 없습니다.';
  }

  if (normalized.includes('parent comment not found')) {
    return '답글을 작성할 원본 댓글을 찾을 수 없습니다.';
  }

  if (normalized.includes('comment not found')) {
    return '요청한 댓글을 찾을 수 없습니다.';
  }

  if (normalized.includes('user not found')) {
    return '사용자 정보를 찾을 수 없습니다.';
  }

  if (normalized.includes('image file is required')) {
    return '이미지 파일을 선택해주세요.';
  }

  if (normalized.includes('scheduledat is required')) {
    return '예약 발행 시간을 입력해주세요.';
  }

  if (normalized.includes('scheduledat must be a future date')) {
    return '예약 발행 시간은 현재보다 이후여야 합니다.';
  }

  if (normalized.includes('unsupported settings media key')) {
    return '지원하지 않는 설정 이미지 항목입니다.';
  }

  if (normalized.includes('invalid path')) {
    return '요청 경로가 올바르지 않습니다.';
  }

  if (normalized.includes('internal server error')) {
    return SERVER_ERROR_MESSAGE;
  }

  if (statusCode === 401 && normalized.includes('credential')) {
    return '아이디 또는 비밀번호가 올바르지 않습니다.';
  }

  if (statusCode !== undefined && statusCode >= 500 && hasInternalErrorDetails(message)) {
    return SERVER_ERROR_MESSAGE;
  }

  if (hasInternalErrorDetails(message)) {
    return fallbackMessageByStatus(statusCode) ?? DEFAULT_ERROR_MESSAGE;
  }

  return message;
}

function resolveMessageValue(
  value: unknown,
  statusCode?: number,
  errorName?: string | null,
  errorCode?: string | null,
): string | null {
  if (Array.isArray(value)) {
    const messages = value
      .map((item) =>
        typeof item === 'string'
          ? resolveFriendlyMessage(item, statusCode, errorName, errorCode)
          : null,
      )
      .filter(Boolean);

    return messages.length > 0 ? messages.join(', ') : null;
  }

  if (typeof value === 'string') {
    return resolveFriendlyMessage(value, statusCode, errorName, errorCode);
  }

  return null;
}

export function splitTags(tags?: string | null): string[] {
  if (!tags) {
    return [];
  }

  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return '미정';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

export function getErrorMessage(error: unknown): string {
  const record = asRecord(error);
  const responseRecord = asRecord(record?.response);
  const responseData = asRecord(responseRecord?.data);
  const errorName = asString(responseData?.error) ?? asString(record?.error);
  const errorCode = asString(responseData?.code) ?? asString(record?.code);
  const statusCode =
    asNumber(responseData?.statusCode) ??
    asNumber(responseRecord?.status) ??
    asNumber(record?.statusCode);

  const message =
    resolveMessageValue(responseData?.message, statusCode, errorName, errorCode) ??
    resolveMessageValue(record?.message, statusCode, errorName, errorCode) ??
    (error instanceof Error
      ? resolveFriendlyMessage(error.message, statusCode, errorName, errorCode)
      : null) ??
    fallbackMessageByStatus(statusCode);

  return message ?? DEFAULT_ERROR_MESSAGE;
}

export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const origin = resolvePublicApiOrigin();
  return origin ? new URL(normalizedPath, origin).toString() : normalizedPath;
}
