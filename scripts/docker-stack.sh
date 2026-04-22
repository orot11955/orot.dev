#!/bin/sh
set -eu

COMMAND="${1:-deploy}"
WAIT_TIMEOUT="${DOCKER_WAIT_TIMEOUT:-120}"
LOG_TAIL="${DOCKER_LOG_TAIL:-80}"
BUILD_API_IMAGE="${BUILD_API_IMAGE:-true}"
FAILURE_LOG_SERVICES=""
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"

if [ -z "$COMPOSE_ENV_FILE" ]; then
  COMPOSE_ENV_FILE=".env.production"
fi

log() {
  printf '%s\n' "$1"
}

docker_compose() {
  docker compose --env-file "$COMPOSE_ENV_FILE" "$@"
}

require_command() {
  command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    log "Required command not found: $command_name"
    exit 1
  fi
}

require_file() {
  file_path="$1"
  description="$2"

  if [ ! -f "$file_path" ]; then
    log "Missing $description: $file_path"
    exit 1
  fi
}

validate_compose() {
  log "Validating Docker Compose config..."
  docker_compose config >/dev/null
}

preflight_base() {
  require_command docker
  require_file "$COMPOSE_ENV_FILE" "Compose environment file"
}

preflight_build() {
  preflight_base
}

preflight_deploy() {
  preflight_build
  require_file nginx/nginx.conf "Nginx config"
}

build_app_images() {
  preflight_build
  validate_compose

  log "Building application images..."
  docker_compose build --pull orot-api orot-web
}

build_api_image() {
  preflight_build
  validate_compose

  log "Building API image..."
  docker_compose build --pull orot-api
}

start_database() {
  FAILURE_LOG_SERVICES="db"

  log "Starting database and waiting for health checks..."
  docker_compose up -d --wait --wait-timeout "$WAIT_TIMEOUT" db
}

run_migration_job() {
  FAILURE_LOG_SERVICES="db orot-migrate"

  log "Running Prisma migration job..."
  docker_compose --profile ops run --rm --no-deps orot-migrate
}

start_application_stack() {
  preflight_deploy
  FAILURE_LOG_SERVICES="db orot-api orot-web nginx"

  log "Starting application services..."
  docker_compose up -d \
    --no-build \
    --remove-orphans \
    --wait \
    --wait-timeout "$WAIT_TIMEOUT" \
    db orot-api orot-web nginx
}

reload_nginx_config() {
  FAILURE_LOG_SERVICES="nginx"

  log "Validating and reloading Nginx config..."
  docker_compose exec -T nginx nginx -t
  docker_compose exec -T nginx nginx -s reload
}

print_status() {
  log "Current service status:"
  docker_compose ps
}

print_failure_context() {
  status="$1"

  if [ "$status" -eq 0 ]; then
    return
  fi

  set +e

  log "Docker stack command failed with exit code $status."

  if command -v docker >/dev/null 2>&1; then
    log "Current service status:"
    docker_compose ps
  fi

  if [ -n "$FAILURE_LOG_SERVICES" ]; then
    log "Recent logs:"
    docker_compose logs --tail "$LOG_TAIL" $FAILURE_LOG_SERVICES
  fi
}

run_migrate_flow() {
  preflight_base
  validate_compose

  if [ "$BUILD_API_IMAGE" = "true" ]; then
    build_api_image
  fi

  start_database
  run_migration_job
}

trap 'status=$?; trap - EXIT; print_failure_context "$status"; exit "$status"' EXIT

case "$COMMAND" in
  check)
    preflight_base
    validate_compose
    ;;
  build)
    build_app_images
    ;;
  migrate)
    run_migrate_flow
    print_status
    ;;
  deploy)
    build_app_images
    previous_build_api_image="$BUILD_API_IMAGE"
    BUILD_API_IMAGE=false
    run_migrate_flow
    BUILD_API_IMAGE="$previous_build_api_image"
    start_application_stack
    reload_nginx_config
    log "Deployment complete."
    print_status
    ;;
  *)
    log "Unknown command: $COMMAND"
    log "Usage: ./scripts/docker-stack.sh [check|build|migrate|deploy]"
    exit 1
    ;;
esac
