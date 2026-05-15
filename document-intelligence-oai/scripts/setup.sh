#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Document Intelligence setup"
echo "1. Installing dependencies"
pnpm install

echo "2. Checking required CLIs"
command -v gh >/dev/null || { echo "Missing gh CLI"; exit 1; }
command -v vercel >/dev/null || { echo "Missing vercel CLI"; exit 1; }

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is required to provision Supabase."
  exit 1
fi

echo "3. Supabase migrations"
if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  pnpm dlx supabase@latest db push --project-ref "$SUPABASE_PROJECT_ID"
else
  echo "SUPABASE_PROJECT_ID is not set. Create/link the Supabase project, then rerun."
fi

echo "4. Seed"
if [[ -n "${DATABASE_URL:-}" ]]; then
  pnpm seed
else
  echo "DATABASE_URL is not set; seed skipped."
fi

echo "Setup finished. Configure OAuth callback URLs as:"
echo "  http://localhost:3000/auth/callback"
echo "  https://<vercel-url>/auth/callback"
