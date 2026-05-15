# Deployment

## Desde cero

```bash
cp .env.example .env.local
pnpm install
pnpm setup
```

`scripts/setup.sh` crea o enlaza Supabase, aplica migraciones, prepara Storage, configura Vercel y dispara el primer deploy cuando las credenciales estan presentes.

## Rotar credenciales

1. Rotar la llave en el proveedor.
2. Actualizar `.env.local`.
3. Actualizar variables en Vercel.
4. Redeployar desde GitHub Actions o `vercel deploy --prod`.

## Rollback

Usar el rollback de Vercel para frontend. Para DB, aplicar una migracion compensatoria y documentar el incidente en `audit_log`.
