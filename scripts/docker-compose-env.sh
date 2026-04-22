#!/bin/sh
set -eu

ENV_FILE="${COMPOSE_ENV_FILE:-}"

if [ -z "$ENV_FILE" ]; then
  ENV_FILE=".env.production"
fi

if [ ! -f "$ENV_FILE" ]; then
  printf 'Missing Docker Compose env file: %s\n' "$ENV_FILE"
  exit 1
fi

exec docker compose --env-file "$ENV_FILE" "$@"
