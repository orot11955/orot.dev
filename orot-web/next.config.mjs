function resolveDefaultApiPort() {
  return process.env.API_PORT?.trim() || '4000';
}

function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') {
    return '/**';
  }

  return trimmed.endsWith('/**') ? trimmed : `${trimmed}/**`;
}

function resolveApiOrigin() {
  const internalApiOrigin = normalizeDevApiOrigin(
    process.env.INTERNAL_API_ORIGIN?.trim(),
  );
  if (internalApiOrigin) {
    return internalApiOrigin;
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredApiUrl && /^https?:\/\//i.test(configuredApiUrl)) {
    return configuredApiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  return `http://localhost:${resolveDefaultApiPort()}`;
}

function normalizeDevApiOrigin(origin) {
  if (!origin) {
    return '';
  }

  const trimmed = origin.replace(/\/+$/, '');

  if (process.env.NODE_ENV !== 'development') {
    return trimmed;
  }

  try {
    const { hostname } = new URL(trimmed);
    const isDockerServiceHostname =
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      hostname !== '0.0.0.0' &&
      !hostname.includes('.') &&
      !hostname.includes(':');

    return isDockerServiceHostname
      ? `http://localhost:${resolveDefaultApiPort()}`
      : trimmed;
  } catch {
    return trimmed;
  }
}

function parseRemotePattern(pattern) {
  try {
    const url = new URL(pattern);
    return {
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: normalizePathname(url.pathname),
    };
  } catch {
    return null;
  }
}

function resolveImageRemotePatterns() {
  const configuredPatterns = (process.env.WEB_IMAGE_REMOTE_PATTERNS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const defaults = [
    `http://localhost:${resolveDefaultApiPort()}/uploads/**`,
    `http://127.0.0.1:${resolveDefaultApiPort()}/uploads/**`,
    'https://orot.dev/uploads/**',
  ];

  const patterns = (configuredPatterns.length > 0
    ? configuredPatterns
    : defaults)
    .map(parseRemotePattern)
    .filter(Boolean);

  return patterns;
}

function resolveMiddlewareClientMaxBodySize() {
  // In development, browser uploads to /api/* pass through Next.js rewrites
  // before reaching the Nest API. The default 10MB limit is too small for
  // gallery batch uploads (up to 20 files, 50MB each), with extra headroom
  // for multipart form overhead.
  return '1050mb';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    middlewareClientMaxBodySize: resolveMiddlewareClientMaxBodySize(),
  },
  async rewrites() {
    const apiOrigin = resolveApiOrigin();
    const uploadRewrite = {
      source: '/uploads/:path*',
      destination: `${apiOrigin}/uploads/:path*`,
    };

    if (process.env.NODE_ENV !== 'development') {
      return [uploadRewrite];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
      uploadRewrite,
    ];
  },
  images: {
    remotePatterns: resolveImageRemotePatterns(),
  },
};

export default nextConfig;
