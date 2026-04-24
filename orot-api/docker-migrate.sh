#!/bin/sh
set -eu

PRISMA_BIN="./node_modules/.bin/prisma"

echo "Applying Prisma migrations..."
"$PRISMA_BIN" migrate deploy

if [ "${DB_SEED_ON_DEPLOY:-true}" = "true" ]; then
  echo "Running database seed..."
  "$PRISMA_BIN" db seed
else
  echo "Skipping database seed because DB_SEED_ON_DEPLOY=false"
fi
