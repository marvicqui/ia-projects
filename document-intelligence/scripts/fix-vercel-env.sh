#!/usr/bin/env bash
# scripts/fix-vercel-env.sh
# Re-sube los env vars de .env.local a Vercel de forma confiable
# (el loop original en setup.sh dejaba valores vacíos).
#
# Usage: cd document-intelligence && ./scripts/fix-vercel-env.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"  # .vercel/ link vive aquí, no en apps/web/

ENV_FILE="$ROOT/.env.local"
[ -f "$ENV_FILE" ] || { echo "Falta $ENV_FILE"; exit 1; }

# Lee key=value respetando valores con '=' y quotes; ignora comentarios.
# Usa FD 3 para evitar que `vercel env add` consuma stdin.
while IFS= read -r line <&3; do
  # Skip comments and empty lines
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  # Skip lines without '='
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Strip optional surrounding quotes from value
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"

  # Trim trailing whitespace/CR
  value="${value%$'\r'}"

  # Skip empty values
  [ -z "$value" ] && { echo "skip $key (empty)"; continue; }

  # Skip GITHUB_TOKEN / VERCEL_TOKEN (locales, no a Vercel)
  [[ "$key" == "GITHUB_TOKEN" || "$key" == "VERCEL_TOKEN" || "$key" == "VERCEL_ORG_ID" || "$key" == "VERCEL_PROJECT_ID" ]] && { echo "skip $key (local only)"; continue; }

  echo "→ $key"
  vercel env rm "$key" production --yes 2>/dev/null || true
  vercel env add "$key" production --value "$value" --yes --force >/dev/null 2>&1 \
    && echo "  ✓ uploaded" \
    || echo "  ✗ FAILED"
done 3< "$ENV_FILE"

echo ""
echo "Done. Verifica con: vercel env ls production"
