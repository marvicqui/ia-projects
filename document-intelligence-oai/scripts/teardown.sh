#!/usr/bin/env bash
set -euo pipefail

echo "Teardown is intentionally conservative."
echo "It will not delete cloud projects unless DELETE_CLOUD_PROJECTS=true."

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Database teardown should be done with a disposable Supabase project."
  echo "Run pnpm dlx supabase db reset --linked only when you are certain."
fi

if [[ "${DELETE_CLOUD_PROJECTS:-false}" == "true" ]]; then
  echo "Cloud deletion requested, but this script still requires manual confirmation in provider CLIs."
  vercel project rm document-intelligence-oai || true
fi
