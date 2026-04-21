#!/bin/sh
set -eu

WAIT_TIMEOUT="${DOCKER_WAIT_TIMEOUT:-120}"

echo "Validating Docker Compose config..."
docker compose config >/dev/null

echo "Building application images..."
docker compose build --pull

BUILD_API_IMAGE=false DOCKER_WAIT_TIMEOUT="$WAIT_TIMEOUT" ./scripts/docker-migrate.sh

echo "Starting application services..."
docker compose up -d \
  --no-build \
  --pull always \
  --remove-orphans \
  --wait \
  --wait-timeout "$WAIT_TIMEOUT" \
  db orot-api orot-web nginx

echo "Deployment complete. Current service status:"
docker compose ps
