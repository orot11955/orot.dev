import type { NextConfig } from 'next';

function resolveDevApiOrigin(): string {
  const internalApiOrigin = process.env.INTERNAL_API_ORIGIN?.trim();
  if (internalApiOrigin) {
    return internalApiOrigin.replace(/\/+$/, '');
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredApiUrl && /^https?:\/\//i.test(configuredApiUrl)) {
    return configuredApiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  return 'http://localhost:4000';
}

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    const apiOrigin = resolveDevApiOrigin();

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '10.10.10.3',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'orot.dev',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
