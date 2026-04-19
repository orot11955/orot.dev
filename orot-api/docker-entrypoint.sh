#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma db push

echo "Ensuring admin user exists..."
./node_modules/.bin/prisma db seed

echo "Starting API server..."
exec node dist/src/main.js
