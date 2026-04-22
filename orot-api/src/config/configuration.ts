function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function readBooleanEnv(...keys: string[]): boolean | undefined {
  const value = readEnv(...keys);
  if (value === undefined) {
    return undefined;
  }

  return value === 'true';
}

function readNumberEnv(...keys: string[]): number | undefined {
  const value = readEnv(...keys);
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const defaultWebPort = readEnv('WEB_PORT') || '3000';
const defaultWebOrigins = [
  `http://localhost:${defaultWebPort}`,
  `http://127.0.0.1:${defaultWebPort}`,
  `http://forge.home:${defaultWebPort}`,
];

const configuredWebOrigins = splitCsv(readEnv('WEB_ORIGIN'));
const slowQueryMs = readNumberEnv('API_SLOW_QUERY_MS', 'SLOW_QUERY_MS') ?? 300;
const requestBodyLimit =
  readEnv('API_REQUEST_BODY_LIMIT', 'REQUEST_BODY_LIMIT') || '50mb';

export default () => ({
  port: readNumberEnv('API_PORT', 'PORT') ?? 4000,
  siteUrl: readEnv('SITE_URL') || 'https://orot.dev',
  webOrigin: configuredWebOrigins[0] || defaultWebOrigins[0],
  webOrigins: Array.from(
    new Set([...defaultWebOrigins, ...configuredWebOrigins]),
  ),
  httpLogging: readBooleanEnv('API_HTTP_LOGGING', 'HTTP_LOGGING') ?? false,
  logLevel:
    readEnv('API_LOG_LEVEL', 'LOG_LEVEL') ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  logPretty: readBooleanEnv('API_LOG_PRETTY', 'LOG_PRETTY') ?? false,
  slowQueryMs: Number.isFinite(slowQueryMs) ? slowQueryMs : 300,
  requestBodyLimit,
  auth: {
    accessSecret:
      readEnv('API_JWT_ACCESS_SECRET', 'JWT_ACCESS_SECRET') || 'access-secret',
    refreshSecret:
      readEnv('API_JWT_REFRESH_SECRET', 'JWT_REFRESH_SECRET') ||
      'refresh-secret',
    accessExpiresIn:
      readEnv('API_JWT_ACCESS_EXPIRES_IN', 'JWT_ACCESS_EXPIRES_IN') || '15m',
    refreshExpiresIn:
      readEnv('API_JWT_REFRESH_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN') || '30d',
  },
  cookie: {
    domain: readEnv('API_COOKIE_DOMAIN', 'COOKIE_DOMAIN') || '',
    secure: readBooleanEnv('API_COOKIE_SECURE', 'COOKIE_SECURE') ?? false,
  },
  studio: {
    username: readEnv('API_STUDIO_USERNAME', 'STUDIO_USERNAME') || 'admin',
    password: readEnv('API_STUDIO_PASSWORD', 'STUDIO_PASSWORD') || 'admin',
  },
});
