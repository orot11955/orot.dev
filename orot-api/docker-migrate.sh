#!/bin/sh
set -eu

PRISMA_BIN="./node_modules/.bin/prisma"

run_migrate_deploy() {
  output_file="$(mktemp)"

  if "$PRISMA_BIN" migrate deploy >"$output_file" 2>&1; then
    cat "$output_file"
    rm -f "$output_file"
    return 0
  fi

  status=$?
  cat "$output_file" >&2

  if grep -q "Error: P3005" "$output_file"; then
    rm -f "$output_file"
    return 20
  fi

  rm -f "$output_file"
  return "$status"
}

verify_schema_matches_before_baseline() {
  output_file="$(mktemp)"

  if "$PRISMA_BIN" migrate diff \
    --from-config-datasource \
    --to-schema prisma/schema.prisma \
    --exit-code >"$output_file" 2>&1; then
    rm -f "$output_file"
    return 0
  fi

  status=$?
  cat "$output_file" >&2
  rm -f "$output_file"

  if [ "$status" -eq 2 ]; then
    echo "Current database schema differs from prisma/schema.prisma, so automatic baseline was aborted." >&2
  fi

  return "$status"
}

baseline_legacy_database() {
  if [ "${DB_AUTO_BASELINE_LEGACY:-true}" != "true" ]; then
    echo "Legacy Prisma-untracked database detected, but DB_AUTO_BASELINE_LEGACY is disabled." >&2
    echo "Enable DB_AUTO_BASELINE_LEGACY=true or run prisma migrate resolve manually." >&2
    return 1
  fi

  echo "Legacy Prisma-untracked database detected. Verifying schema before baseline..."
  verify_schema_matches_before_baseline

  found_migration=0
  for migration_dir in prisma/migrations/*; do
    if [ ! -d "$migration_dir" ]; then
      continue
    fi

    found_migration=1
    migration_name="$(basename "$migration_dir")"
    echo "Marking migration as already applied: $migration_name"
    "$PRISMA_BIN" migrate resolve --applied "$migration_name"
  done

  if [ "$found_migration" -eq 0 ]; then
    echo "No Prisma migrations were found to baseline." >&2
    return 1
  fi
}

echo "Applying Prisma migrations..."
if run_migrate_deploy; then
  :
else
  status=$?

  if [ "$status" -ne 20 ]; then
    exit "$status"
  fi

  baseline_legacy_database
  run_migrate_deploy
fi

if [ "${DB_SEED_ON_DEPLOY:-true}" = "true" ]; then
  echo "Running database seed..."
  "$PRISMA_BIN" db seed
else
  echo "Skipping database seed because DB_SEED_ON_DEPLOY=false"
fi
