const defaultWebOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://10.10.10.3:3000',
  'http://10.10.10.3:3001',
];

const configuredWebOrigins = (process.env.WEB_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const slowQueryMs = Number.parseInt(process.env.SLOW_QUERY_MS || '300', 10);
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT?.trim() || '20mb';

export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  webOrigin: configuredWebOrigins[0] || defaultWebOrigins[0],
  webOrigins: Array.from(
    new Set([...defaultWebOrigins, ...configuredWebOrigins]),
  ),
  httpLogging: process.env.HTTP_LOGGING === 'true',
  logLevel:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  logPretty: process.env.LOG_PRETTY === 'true',
  slowQueryMs: Number.isFinite(slowQueryMs) ? slowQueryMs : 300,
  requestBodyLimit,
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || '',
    secure: process.env.COOKIE_SECURE === 'true',
  },
  studio: {
    username: process.env.STUDIO_USERNAME || 'admin',
    password: process.env.STUDIO_PASSWORD || 'admin',
  },
});
