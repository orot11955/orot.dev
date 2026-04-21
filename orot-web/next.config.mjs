function resolveApiOrigin() {
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

/** @type {import('next').NextConfig} */
const nextConfig = {
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
