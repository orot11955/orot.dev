#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "${DB_SEED_ON_DEPLOY:-true}" = "true" ]; then
  echo "Running database seed..."
  ./node_modules/.bin/prisma db seed
else
  echo "Skipping database seed because DB_SEED_ON_DEPLOY=false"
fi
