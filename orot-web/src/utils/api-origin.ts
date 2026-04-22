const DEFAULT_PUBLIC_API_BASE = '/api';

function resolveDefaultApiPort(): string {
  return process.env.API_PORT?.trim() || '4000';
}

function resolveDefaultServerApiOrigin(): string {
  return `http://localhost:${resolveDefaultApiPort()}`;
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isLikelyContainerServiceHostname(hostname: string): boolean {
  return hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    hostname !== '0.0.0.0' &&
    !hostname.includes('.') &&
    !hostname.includes(':');
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

function normalizeDevAbsoluteUrl(url: string): string {
  if (process.env.NODE_ENV !== 'development' || !isAbsoluteUrl(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (!isLikelyContainerServiceHostname(parsed.hostname)) {
      return url;
    }

    parsed.hostname = 'localhost';
    parsed.port = resolveDefaultApiPort();
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resolvePublicApiOrigin(): string {
  const configuredApiUrl = normalizeDevAbsoluteUrl(
    process.env.NEXT_PUBLIC_API_URL?.trim() ?? '',
  );

  if (!configuredApiUrl || !isAbsoluteUrl(configuredApiUrl)) {
    return '';
  }

  return normalizeAbsoluteApiBase(configuredApiUrl).replace(/\/api$/, '');
}

export function resolvePublicApiBaseUrl(): string {
  const configuredApiUrl = normalizeDevAbsoluteUrl(
    process.env.NEXT_PUBLIC_API_URL?.trim() ?? '',
  );

  if (!configuredApiUrl) {
    return DEFAULT_PUBLIC_API_BASE;
  }

  if (isAbsoluteUrl(configuredApiUrl)) {
    return normalizeAbsoluteApiBase(configuredApiUrl);
  }

  return normalizeRelativeApiBase(configuredApiUrl);
}

export function resolveServerApiBaseUrl(): string {
  const internalApiOrigin = normalizeDevAbsoluteUrl(
    process.env.INTERNAL_API_ORIGIN?.trim() ?? '',
  );
  if (internalApiOrigin && isAbsoluteUrl(internalApiOrigin)) {
    return normalizeAbsoluteApiBase(internalApiOrigin);
  }

  const configuredApiUrl = normalizeDevAbsoluteUrl(
    process.env.NEXT_PUBLIC_API_URL?.trim() ?? '',
  );
  if (configuredApiUrl && isAbsoluteUrl(configuredApiUrl)) {
    return normalizeAbsoluteApiBase(configuredApiUrl);
  }

  return `${resolveDefaultServerApiOrigin()}/api`;
}
