#!/bin/sh
set -eu

WAIT_TIMEOUT="${DOCKER_WAIT_TIMEOUT:-120}"
BUILD_API_IMAGE="${BUILD_API_IMAGE:-true}"

echo "Validating Docker Compose config..."
docker compose config >/dev/null

if [ "$BUILD_API_IMAGE" = "true" ]; then
  echo "Building API image..."
  docker compose build --pull orot-api
fi

echo "Starting database and waiting for health checks..."
docker compose up -d --wait --wait-timeout "$WAIT_TIMEOUT" db

echo "Running Prisma migration job..."
docker compose --profile ops run --rm --no-deps orot-migrate
