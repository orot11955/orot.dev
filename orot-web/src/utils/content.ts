import { resolvePublicApiOrigin } from './api-origin';

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
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return '데이터를 불러오지 못했습니다.';
}

export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const origin = resolvePublicApiOrigin();
  return origin ? new URL(normalizedPath, origin).toString() : normalizedPath;
}
