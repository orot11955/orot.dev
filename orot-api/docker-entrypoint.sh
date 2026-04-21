#!/bin/sh
set -e

echo "Starting API server..."
exec node dist/src/main.js
