#!/bin/sh
set -eu

exec "$(dirname "$0")/docker-stack.sh" deploy "$@"
