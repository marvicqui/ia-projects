# ADR 005 — Multi-tenancy con "workspaces" (no "organizations")

- **Status:** Accepted
- **Date:** 2026-05-14

## Contexto

El proyecto necesita aislamiento por tenant. Nombres comunes en SaaS: "tenant", "organization", "workspace", "account".

El prompt original usaba "organization". Lo cambiamos a "workspace".

## Decisión

Usar **`workspace`** como nombre canónico del tenant.

## Justificación

- "Organization" implica una entidad legal/comercial. Nuestros usuarios podrían crear varios workspaces de prueba personales antes de pasar a producción.
- "Workspace" se siente más flexible (Notion, Slack, Linear lo usan).
- Como ya cambiamos esto, dejarlo documentado evita confusión con el archivo `supabase-schema.sql` original del prompt que mencionaba "organizations".

## Implementación

- Tabla: `workspaces` (no `organizations`).
- Tabla pivote: `workspace_members` con `role` enum.
- Cookie de tenant activo: `active_workspace_id`.
- Trigger `handle_new_user` crea workspace default al signup.

## Consecuencias

- **+** Onboarding más simple (cualquier user crea workspaces a discreción).
- **−** Si el cliente JVP quiere modelo enterprise estricto (1 user = 1 organization), tendríamos que renombrar — pero RLS y APIs no cambiarían.
