function parseUrl(value?: string | null): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function resolveSiteUrl(): URL {
  const configuredUrl =
    parseUrl(process.env.SITE_URL) ??
    parseUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  return new URL(
    `http://localhost:${process.env.WEB_PORT ?? process.env.PORT ?? '3000'}`,
  );
}
