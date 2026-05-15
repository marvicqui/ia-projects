# Deployment

## Desde cero

```bash
cp .env.example .env.local
pnpm install
pnpm setup
```

`scripts/setup.sh` crea o enlaza Supabase, aplica migraciones, prepara Storage, configura Vercel, sube variables de entorno y dispara el primer deploy cuando las credenciales estan presentes.

La URL de produccion inicial creada para esta fase es:

`https://document-intelligence-oai.vercel.app`

## Variables requeridas para deploy completo

- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` o `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REGION`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
- OAuth Google y Microsoft para Supabase Auth.
- `N8N_BASE_URL` y `N8N_API_KEY` si se importan workflows a n8n Cloud.

## OAuth callback URLs

Registrar estas URLs en Google OAuth, Microsoft Entra y Supabase Auth:

- `http://localhost:3000/auth/callback`
- `https://<vercel-url>/auth/callback`

Supabase CLI no configura todos los providers OAuth de forma estable; esa parte queda documentada como paso manual.

## Rotar credenciales

1. Rotar la llave en el proveedor.
2. Actualizar `.env.local`.
3. Actualizar variables en Vercel.
4. Redeployar desde GitHub Actions o `vercel deploy --prod`.

## Rollback

Usar el rollback de Vercel para frontend. Para DB, aplicar una migracion compensatoria y documentar el incidente en `audit_log`.
