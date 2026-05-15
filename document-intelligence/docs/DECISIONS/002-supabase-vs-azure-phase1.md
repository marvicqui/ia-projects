# ADR 002 — Supabase en Fase 1 (no Azure)

- **Status:** Accepted
- **Date:** 2026-05-14

## Contexto

El cliente final (JVP) opera en stack Microsoft (Office 365). Sería natural usar Azure SQL + Azure Functions. Pero estamos en Fase 1 (validación), no en producción enterprise.

## Decisión

Usar **Supabase** (Postgres + Auth + Storage + RLS + Edge Functions) en Fase 1. Mantener Azure como roadmap explícito ([AZURE_MIGRATION.md](../AZURE_MIGRATION.md)).

## Justificación

| Eje                    | Supabase             | Azure                    |
|------------------------|----------------------|--------------------------|
| Setup time             | 5 min                | Días                     |
| Cost (free tier)       | $0 hasta 50k MAUs    | $20+/mo Azure SQL        |
| RLS                    | Native + Auth UID    | Manual Row-Level         |
| Dev experience         | Excelent             | OK                       |
| Migration path         | Bien definido        | N/A                      |

Como cada módulo es independiente, la migración a Azure se puede hacer **un módulo a la vez** cuando el cliente lo requiera.

## Consecuencias

- **+** Velocidad de validación máxima.
- **+** Tier gratuito permite 5+ clientes piloto sin pagar.
- **−** Eventual migración a Azure es trabajo grande (10-14 semanas).
- **−** El cliente JVP podría pedir Azure-native antes de tiempo.
