#!/usr/bin/env bash
# scripts/teardown.sh — borra recursos creados por setup.sh.
# Útil para empezar de cero.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env.local 2>/dev/null || true; set +a

read -p "Esto BORRARÁ el proyecto Supabase y el proyecto Vercel. ¿Continuar? (yes/no): " confirm
[ "$confirm" = "yes" ] || { echo "Cancelado."; exit 1; }

if [ -n "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Borrando proyecto Supabase $SUPABASE_PROJECT_REF…"
  supabase projects delete "$SUPABASE_PROJECT_REF" --confirm || true
fi

cd apps/web
vercel remove --yes 2>/dev/null || true

# Reset .env.local removing dynamic entries
sed -i.bak '/^SUPABASE_PROJECT_REF=/d; /^SUPABASE_DB_PASSWORD=/d; /^NEXT_PUBLIC_SUPABASE_URL=/d; /^NEXT_PUBLIC_SUPABASE_ANON_KEY=/d; /^SUPABASE_SERVICE_ROLE_KEY=/d' ../../.env.local
rm -f ../../.env.local.bak
echo "Done."
