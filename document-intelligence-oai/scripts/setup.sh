#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Document Intelligence setup"
echo "1. Loading .env.local if present"
if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

echo "2. Installing dependencies"
pnpm install

echo "3. Checking required CLIs"
command -v gh >/dev/null || { echo "Missing gh CLI"; exit 1; }
command -v vercel >/dev/null || { echo "Missing vercel CLI"; exit 1; }
command -v supabase >/dev/null || echo "Supabase CLI will be run through pnpm dlx."

echo "4. Installing gitleaks pre-commit hook"
mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
if command -v gitleaks >/dev/null; then
  gitleaks protect --staged --redact
else
  echo "gitleaks CLI not found; install it with brew install gitleaks before production commits."
fi
HOOK
chmod +x .git/hooks/pre-commit

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is required to provision Supabase."
  exit 1
fi

echo "5. Supabase project"
if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  pnpm dlx supabase@latest link --project-ref "$SUPABASE_PROJECT_ID"
else
  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    echo "SUPABASE_DB_PASSWORD is required to create a new Supabase project."
    exit 1
  fi
  PROJECT_JSON="$(pnpm dlx supabase@latest projects create document-intelligence-oai --org-id "${SUPABASE_ORG_ID:-uetjfsddehzlfljjyabl}" --db-password "$SUPABASE_DB_PASSWORD" --region "${SUPABASE_PROJECT_REGION:-us-east-1}" --output json --yes)"
  SUPABASE_PROJECT_ID="$(printf '%s' "$PROJECT_JSON" | node -e "let data='';process.stdin.on('data',d=>data+=d);process.stdin.on('end',()=>console.log(JSON.parse(data).id ?? JSON.parse(data).ref ?? ''))")"
  pnpm dlx supabase@latest link --project-ref "$SUPABASE_PROJECT_ID"
fi

echo "6. Supabase migrations"
pnpm dlx supabase@latest db push --project-ref "$SUPABASE_PROJECT_ID"

echo "7. Seed"
if [[ -n "${DATABASE_URL:-}" ]]; then
  pnpm seed
else
  echo "DATABASE_URL is not set; seed skipped."
fi

echo "8. Vercel link and env"
vercel link --yes --project document-intelligence-oai

set_vercel_env() {
  local key="$1"
  local value="${!key:-}"
  if [[ -n "$value" ]]; then
    printf "%s" "$value" | vercel env add "$key" production --force >/dev/null || true
    printf "%s" "$value" | vercel env add "$key" preview --force >/dev/null || true
  fi
}

for key in \
  NEXT_PUBLIC_APP_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_BRAND_PRIMARY_COLOR \
  LEGAL_COMPANY_NAME PLATFORM_ADMIN_EMAIL SUPABASE_PROJECT_ID SUPABASE_SERVICE_ROLE_KEY DATABASE_URL \
  ANTHROPIC_API_KEY ANTHROPIC_HAIKU_MODEL ANTHROPIC_SONNET_MODEL OPENAI_API_KEY OPENAI_EMBEDDING_MODEL \
  RESEND_API_KEY RESEND_FROM_EMAIL TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_WHATSAPP_FROM \
  GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET MICROSOFT_OAUTH_CLIENT_ID MICROSOFT_OAUTH_CLIENT_SECRET \
  MICROSOFT_OAUTH_TENANT_ID N8N_BASE_URL N8N_API_KEY; do
  set_vercel_env "$key"
done

echo "9. First production deploy"
vercel deploy --prod --yes

echo "Setup finished. Configure OAuth callback URLs as:"
echo "  http://localhost:3000/auth/callback"
echo "  https://<vercel-url>/auth/callback"
