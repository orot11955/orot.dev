import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(SCRIPT_DIR, '..');

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = rawLine.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    const value = stripWrappingQuotes(rawLine.slice(separatorIndex + 1).trim());
    entries[key] = value;
  }

  return entries;
}

function resolveBaseEnvFile(mode) {
  const primary = resolve(REPO_ROOT, `.env.${mode}`);
  if (existsSync(primary)) {
    return primary;
  }

  const fallback = resolve(REPO_ROOT, `.env.${mode}.example`);
  return existsSync(fallback) ? fallback : null;
}

export function loadRootEnv(mode) {
  const baseFile = resolveBaseEnvFile(mode);
  const sharedLocalFile = resolve(REPO_ROOT, '.env.local');
  const modeLocalFile = resolve(REPO_ROOT, `.env.${mode}.local`);

  const layeredEntries = [
    baseFile,
    sharedLocalFile,
    modeLocalFile,
  ]
    .filter((filePath) => filePath && existsSync(filePath))
    .map((filePath) => parseEnvFile(filePath));

  return Object.assign({}, ...layeredEntries, process.env);
}

function firstDefined(env, ...keys) {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return undefined;
}

function assignMappedValue(target, key, value) {
  if (value === undefined || value === '') {
    return;
  }

  target[key] = value;
}

export function buildAppEnv(app, mode) {
  const rootEnv = loadRootEnv(mode);
  const env = {
    ...rootEnv,
    NODE_ENV: mode,
  };

  if (app === 'web') {
    assignMappedValue(env, 'PORT', firstDefined(rootEnv, 'WEB_PORT', 'PORT'));
    assignMappedValue(
      env,
      'NEXT_PUBLIC_SITE_URL',
      firstDefined(rootEnv, 'NEXT_PUBLIC_SITE_URL', 'SITE_URL'),
    );
    assignMappedValue(
      env,
      'CLIENT_ERROR_LOGGING',
      firstDefined(
        rootEnv,
        'CLIENT_ERROR_LOGGING',
        'NEXT_PUBLIC_CLIENT_ERROR_LOGGING',
      ),
    );
    assignMappedValue(
      env,
      'NEXT_PUBLIC_CLIENT_ERROR_LOGGING',
      firstDefined(
        rootEnv,
        'NEXT_PUBLIC_CLIENT_ERROR_LOGGING',
        'CLIENT_ERROR_LOGGING',
      ),
    );
  }

  if (app === 'api') {
    assignMappedValue(env, 'PORT', firstDefined(rootEnv, 'API_PORT', 'PORT'));
    assignMappedValue(
      env,
      'DATABASE_URL',
      firstDefined(rootEnv, 'API_DATABASE_URL', 'DATABASE_URL'),
    );
    assignMappedValue(
      env,
      'HTTP_LOGGING',
      firstDefined(rootEnv, 'API_HTTP_LOGGING', 'HTTP_LOGGING'),
    );
    assignMappedValue(
      env,
      'REQUEST_BODY_LIMIT',
      firstDefined(rootEnv, 'API_REQUEST_BODY_LIMIT', 'REQUEST_BODY_LIMIT'),
    );
    assignMappedValue(
      env,
      'SLOW_QUERY_MS',
      firstDefined(rootEnv, 'API_SLOW_QUERY_MS', 'SLOW_QUERY_MS'),
    );
    assignMappedValue(
      env,
      'COOKIE_SECURE',
      firstDefined(rootEnv, 'API_COOKIE_SECURE', 'COOKIE_SECURE'),
    );
    assignMappedValue(
      env,
      'COOKIE_DOMAIN',
      firstDefined(rootEnv, 'API_COOKIE_DOMAIN', 'COOKIE_DOMAIN'),
    );
    assignMappedValue(
      env,
      'STUDIO_USERNAME',
      firstDefined(rootEnv, 'API_STUDIO_USERNAME', 'STUDIO_USERNAME'),
    );
    assignMappedValue(
      env,
      'STUDIO_PASSWORD',
      firstDefined(rootEnv, 'API_STUDIO_PASSWORD', 'STUDIO_PASSWORD'),
    );
    assignMappedValue(
      env,
      'JWT_ACCESS_SECRET',
      firstDefined(rootEnv, 'API_JWT_ACCESS_SECRET', 'JWT_ACCESS_SECRET'),
    );
    assignMappedValue(
      env,
      'JWT_REFRESH_SECRET',
      firstDefined(rootEnv, 'API_JWT_REFRESH_SECRET', 'JWT_REFRESH_SECRET'),
    );
    assignMappedValue(
      env,
      'JWT_ACCESS_EXPIRES_IN',
      firstDefined(
        rootEnv,
        'API_JWT_ACCESS_EXPIRES_IN',
        'JWT_ACCESS_EXPIRES_IN',
      ),
    );
    assignMappedValue(
      env,
      'JWT_REFRESH_EXPIRES_IN',
      firstDefined(
        rootEnv,
        'API_JWT_REFRESH_EXPIRES_IN',
        'JWT_REFRESH_EXPIRES_IN',
      ),
    );
    assignMappedValue(env, 'SITE_URL', firstDefined(rootEnv, 'SITE_URL'));
    assignMappedValue(env, 'WEB_ORIGIN', firstDefined(rootEnv, 'WEB_ORIGIN'));
    assignMappedValue(
      env,
      'LOG_LEVEL',
      firstDefined(rootEnv, 'API_LOG_LEVEL', 'LOG_LEVEL'),
    );
  }

  return env;
}
