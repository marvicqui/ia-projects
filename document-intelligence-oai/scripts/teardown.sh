#!/usr/bin/env bash
set -euo pipefail

echo "Teardown is intentionally conservative."
echo "Set DATABASE_URL and run migrations/seeds against a disposable project to reset data."
