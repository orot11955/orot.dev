const DEFAULT_API_PORT = '4000';
const DEFAULT_PUBLIC_API_BASE = '/api';
const DEFAULT_SERVER_API_ORIGIN = `http://localhost:${DEFAULT_API_PORT}`;

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function normalizeAbsoluteApiBase(url: string): string {
  const trimmed = trimTrailingSlash(url);
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function normalizeRelativeApiBase(url: string): string {
  const withLeadingSlash = url.startsWith('/') ? url : `/${url}`;
  return trimTrailingSlash(withLeadingSlash);
}

export function resolvePublicApiOrigin(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredApiUrl || !isAbsoluteUrl(configuredApiUrl)) {
    return '';
  }

  return normalizeAbsoluteApiBase(configuredApiUrl).replace(/\/api$/, '');
}

export function resolvePublicApiBaseUrl(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configuredApiUrl) {
    return DEFAULT_PUBLIC_API_BASE;
  }

  if (isAbsoluteUrl(configuredApiUrl)) {
    return normalizeAbsoluteApiBase(configuredApiUrl);
  }

  return normalizeRelativeApiBase(configuredApiUrl);
}

export function resolveServerApiBaseUrl(): string {
  const internalApiOrigin = process.env.INTERNAL_API_ORIGIN?.trim();
  if (internalApiOrigin && isAbsoluteUrl(internalApiOrigin)) {
    return normalizeAbsoluteApiBase(internalApiOrigin);
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredApiUrl && isAbsoluteUrl(configuredApiUrl)) {
    return normalizeAbsoluteApiBase(configuredApiUrl);
  }

  return `${DEFAULT_SERVER_API_ORIGIN}/api`;
}
