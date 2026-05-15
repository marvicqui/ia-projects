#!/usr/bin/env bash
# scripts/setup.sh — provisioning idempotente de JVP Document Intelligence.
#
# Pre-requisitos:
#   - gh CLI autenticado (gh auth status)
#   - vercel CLI autenticado (vercel whoami)
#   - supabase CLI instalado
#   - pnpm + Node 20+
#   - .env.local con secrets reales (no comiteado)
#
# Lo que hace:
#   1. Verifica autenticaciones
#   2. Crea proyecto Supabase si no existe (us-east-1)
#   3. Llena .env.local con SUPABASE_PROJECT_REF + keys
#   4. Aplica migraciones via supabase db push
#   5. Crea bucket "documents" privado
#   6. Imprime URLs y siguientes pasos manuales (OAuth providers)
#   7. Configura proyecto Vercel + sube env vars
#   8. Deploy preview

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log()  { printf "\033[1;36m▶ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

# ---------- 1. Auth checks ----------
log "Verificando autenticaciones…"
gh auth status >/dev/null 2>&1 || fail "gh CLI no autenticado. Corre: gh auth login"
vercel whoami >/dev/null 2>&1 || fail "vercel CLI no autenticado. Corre: vercel login"
command -v supabase >/dev/null || fail "supabase CLI no instalado. brew install supabase/tap/supabase"
command -v pnpm >/dev/null || fail "pnpm no instalado. npm i -g pnpm"

[ -f .env.local ] || fail ".env.local no existe. Copia .env.example a .env.local y llena los valores."
set -a; . ./.env.local; set +a

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN missing in .env.local}"
: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY missing in .env.local}"
: "${PLATFORM_ADMIN_EMAIL:?PLATFORM_ADMIN_EMAIL missing in .env.local}"

# ---------- 2. Supabase project ----------
PROJECT_NAME="${SUPABASE_PROJECT_NAME:-jvp-document-intelligence}"
ORG_ID_DEFAULT=$(supabase orgs list --output json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null || echo "")

if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  log "Creando proyecto Supabase '$PROJECT_NAME' en us-east-1…"
  if [ -z "$ORG_ID_DEFAULT" ]; then
    fail "No pude detectar tu org de Supabase. Corre: supabase orgs list, y exporta SUPABASE_ORG_ID en .env.local"
  fi

  DB_PASSWORD="${SUPABASE_DB_PASSWORD:-$(openssl rand -base64 24)}"
  echo "$DB_PASSWORD" > .supabase-db-password.tmp
  warn "DB password guardado temporalmente en .supabase-db-password.tmp (mueve a tu password manager y borra)"

  supabase projects create "$PROJECT_NAME" \
    --org-id "${SUPABASE_ORG_ID:-$ORG_ID_DEFAULT}" \
    --region us-east-1 \
    --db-password "$DB_PASSWORD" \
    --output json > .supabase-project.json

  SUPABASE_PROJECT_REF=$(python3 -c "import json; print(json.load(open('.supabase-project.json'))['id'])")
  log "Proyecto creado: $SUPABASE_PROJECT_REF"
  echo "SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF" >> .env.local
  echo "SUPABASE_DB_PASSWORD=$DB_PASSWORD" >> .env.local
fi

# ---------- 3. Link + push migrations ----------
log "Vinculando y aplicando migraciones (supabase db push)…"
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" 2>/dev/null || true
supabase db push --linked

# ---------- 4. Set platform admin email as DB setting ----------
log "Configurando platform.admin_email en Postgres…"
supabase db query --linked \
  "alter database postgres set app.platform_admin_email = '$PLATFORM_ADMIN_EMAIL';" || \
  warn "No pude setear app.platform_admin_email — hazlo manualmente desde el SQL editor."

# ---------- 5. Storage bucket ----------
log "Creando bucket 'documents' privado…"
# Best-effort; bucket creation via CLI is limited, so we use SQL.
supabase db query --linked \
  "insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;" || \
  warn "No pude crear el bucket via CLI — créalo en Storage tab del Dashboard."

# ---------- 6. Fetch Supabase URL + keys ----------
log "Obteniendo URL y anon key del proyecto…"
SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
ANON_KEY=$(supabase projects api-keys --project-ref "$SUPABASE_PROJECT_REF" --output json | python3 -c "import sys,json; keys=json.load(sys.stdin); print([k for k in keys if k['name']=='anon'][0]['api_key'])")
SERVICE_KEY=$(supabase projects api-keys --project-ref "$SUPABASE_PROJECT_REF" --output json | python3 -c "import sys,json; keys=json.load(sys.stdin); print([k for k in keys if k['name']=='service_role'][0]['api_key'])")

# Append to .env.local if missing
grep -q '^NEXT_PUBLIC_SUPABASE_URL=' .env.local || echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" >> .env.local
grep -q '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local || echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY" >> .env.local
grep -q '^SUPABASE_SERVICE_ROLE_KEY=' .env.local || echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY" >> .env.local

# ---------- 7. Manual OAuth instructions ----------
cat <<EOF

═══ ACCIÓN MANUAL: OAuth providers ═══
Ve a https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/auth/providers

Google:
  Client ID:     $GOOGLE_OAUTH_CLIENT_ID
  Client Secret: (de tu .env.local)
  Authorized redirect URI: $SUPABASE_URL/auth/v1/callback

Microsoft (Azure):
  Tenant URL:    https://login.microsoftonline.com/$MICROSOFT_OAUTH_TENANT_ID/v2.0
  Client ID:     $MICROSOFT_OAUTH_CLIENT_ID
  Client Secret: (de tu .env.local)
  Authorized redirect URI: $SUPABASE_URL/auth/v1/callback

URL Configuration:
  Site URL:      $NEXT_PUBLIC_APP_URL
  Redirect URLs: $NEXT_PUBLIC_APP_URL/auth/callback, https://*.vercel.app/auth/callback

═══════════════════════════════════════

EOF

# ---------- 8. Seed synthetic data ----------
log "Sembrando datos sintéticos (pnpm seed)…"
pnpm install
pnpm seed

# ---------- 9. Vercel deploy ----------
log "Configurando proyecto en Vercel…"
cd apps/web
vercel link --yes --project="${VERCEL_PROJECT_NAME:-jvp-doc-intelligence}" 2>/dev/null || vercel link --yes

log "Subiendo env vars a Vercel (production)…"
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  [[ -z "$value" ]] && continue
  echo "$value" | vercel env add "$key" production 2>/dev/null || true
done < ../../.env.local

log "Deploy a Vercel (--prod)…"
DEPLOY_URL=$(vercel --prod --yes 2>&1 | tail -1)

cat <<EOF

═══ DEPLOY COMPLETO ═══
URL:           $DEPLOY_URL
Supabase:      https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF
Vercel:        https://vercel.com/dashboard (proyecto jvp-doc-intelligence)

Próximos pasos:
  1. Configurar OAuth providers (instrucciones arriba)
  2. Login con $PLATFORM_ADMIN_EMAIL → veras /admin disponible
  3. Switch a workspace "Demo Constructora SA" para ver datos seeded
  4. Visita /cfdi/new para probar la conciliación

═══════════════════════════
EOF
