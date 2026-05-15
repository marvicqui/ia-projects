# Deployment

## Quick start (desde cero)

```bash
cd ia-projects/document-intelligence
cp .env.example .env.local      # llena los valores reales
./scripts/setup.sh               # provisiona Supabase + Vercel + seed
```

## Pre-requisitos

| Herramienta | Versión mínima | Auth                                                |
|-------------|----------------|-----------------------------------------------------|
| Node        | 20             | —                                                   |
| pnpm        | 9              | —                                                   |
| gh CLI      | latest         | `gh auth login` (scopes: repo, workflow)            |
| vercel CLI  | latest         | `vercel login`                                      |
| supabase CLI| latest         | API token desde supabase.com/dashboard/account/tokens |

## Variables de entorno

Ver [.env.example](../.env.example). Todas las variables marcadas como `NEXT_PUBLIC_*` son safe para enviar al browser. El resto es server-only.

Las variables se cargan desde `.env.local` en desarrollo y desde Vercel env vars en producción. El script `setup.sh` las sube via `vercel env add`.

## Aplicar migraciones manualmente

```bash
supabase link --project-ref <ref>
supabase db push --linked
```

## Re-deploy a producción

```bash
cd apps/web
vercel --prod
```

O simplemente push a `main` — GitHub Actions corre `deploy.yml`.

## Configurar OAuth

Después de crear el proyecto Supabase:

1. **Google**:
   - Cloud Console → APIs & Services → Credentials → "OAuth 2.0 Client IDs"
   - Authorized redirect URI: `https://<proyecto>.supabase.co/auth/v1/callback`
   - Pega el Client ID + Secret en `Supabase Dashboard → Auth → Providers → Google`.

2. **Microsoft**:
   - Microsoft Entra (Azure AD) → App registrations → New registration
   - Tenant: "Accounts in any organizational directory + personal Microsoft accounts" (multitenant + personal)
   - Redirect URI: `https://<proyecto>.supabase.co/auth/v1/callback`
   - Genera un "Client secret" en Certificates & secrets
   - Pega Client ID + Secret en `Supabase Dashboard → Auth → Providers → Azure`.

3. **URL Configuration** (Supabase Auth → URL Configuration):
   - Site URL: `https://<tu-dominio-vercel>.vercel.app`
   - Redirect URLs: agrega `https://*.vercel.app/auth/callback` para previews + tu dominio custom.

## Rotación de credenciales

1. Genera nueva credencial en el proveedor (Anthropic dashboard, etc.).
2. Actualiza Vercel: `vercel env rm KEY production && vercel env add KEY production`.
3. Actualiza GitHub Actions: `Settings → Secrets → Actions`.
4. Redeploy.

## Rollback

```bash
vercel rollback                          # rollback Vercel a deploy anterior
supabase db reset --linked               # rollback Supabase (destructivo!)
git revert <commit>; git push            # rollback código
```

Para rollback parcial de migraciones: crea una nueva migración con el `down` correspondiente. No edites migraciones ya aplicadas.

## Costos esperados (tier gratuito)

| Servicio   | Free tier                                | Cuándo subirá                                     |
|------------|------------------------------------------|---------------------------------------------------|
| Vercel     | Hobby (libre, sin custom domain)         | Si necesitas custom domain o > 100GB bw → $20/mo |
| Supabase   | Free 500MB DB / 1GB Storage / 50k MAUs   | > 50k usuarios o > 8GB DB → $25/mo Pro            |
| Anthropic  | Pay-as-you-go                            | ~$0.001/CFDI conciliado (Haiku); contratos ~$0.05 cada uno |
| OpenAI     | Pay-as-you-go                            | $0.00002/1k tokens (embeddings)                   |
| Resend     | 100 emails/día / 3000/mes                | > 3000/mes → $20/mo                               |
| Twilio     | $15 trial, después pay-per-message       | $0.005 por WhatsApp template                      |
| n8n Cloud  | $20/mo Starter                           | Fixed                                             |

**Estimado para 5 clientes pilot (10k docs/mes total):** ~$30-60 USD/mes.

## Smoke test post-deploy

```bash
# Verifica que la URL pública responde
curl -I https://<tu-deploy>.vercel.app/                    # 200
curl -I https://<tu-deploy>.vercel.app/login                # 200
curl -I https://<tu-deploy>.vercel.app/dashboard            # 307 → /login (sin sesión)
```
