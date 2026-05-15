# ADR 001 — Monorepo con Turborepo + pnpm

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** Mario Vicente

## Contexto

Tres módulos (CFDI, Laboral, Contratos) van a evolucionar a velocidades distintas. Cada uno necesita su propio versionado, tests aislados y posibilidad de extraerse a un proyecto separado si crece. Pero al mismo tiempo, comparten utilities (auth, DB client, LLM client, UI), y duplicar código rompería la coherencia.

## Decisión

Monorepo con **Turborepo + pnpm workspaces**:

- `apps/web` — única app desplegada (Next.js).
- `packages/shared-*` — utilities cross-módulo.
- `packages/modules/*` — un package por módulo de negocio.

## Alternativas consideradas

- **Nx**: más features pero más opinions y más lento en cold runs. Sobra para 1 app.
- **Lerna**: en mantenimiento mínimo. Turborepo es el sucesor de facto.
- **Múltiples repos**: rompería el flow de desarrollo y requeriría infra de versionado interno.

## Consecuencias

- **+** Builds incrementales con cache (turbo.json).
- **+** Cambiar un shared package se propaga sin publishing.
- **+** Cada módulo es eliminable borrando su carpeta.
- **−** Algunas tools (ESLint, Prettier) requieren config workspace-aware.
