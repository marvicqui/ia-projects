# ADR 003 — Claude Haiku 4.5 como modelo default

- **Status:** Accepted
- **Date:** 2026-05-14

## Contexto

Cada módulo necesita un LLM. Las tareas varían en complejidad:

- CFDI pass 3 (LLM reconciliation): simple structured output.
- Laboral extracción de PDF: vision + structured output (medio).
- Contratos: risk analysis con razonamiento legal (complejo).

## Decisión

Usar **Claude Haiku 4.5** como default para todas las tareas. Solo el "Risk Analyzer" del módulo Contratos usa **Sonnet 4.6**.

## Justificación

- Haiku 4.5 es ~25x más barato que Sonnet ($0.80/MTok vs $20/MTok input).
- Para extracción estructurada con JSON schema bien definido, Haiku rinde >95% accuracy.
- Para razonamiento legal nuanced, Sonnet vale el costo extra.

## Implementación

`packages/shared-agents/src/claude.ts` expone `MODEL_DEFAULT = 'claude-haiku-4-5-20251001'` y `MODEL_FALLBACK = 'claude-sonnet-4-6'`. Módulos eligen explícitamente cuando necesitan el mejor.

## Consecuencias

- **+** Costo bajo (estimado <$0.001 por CFDI conciliado).
- **−** Si Haiku se queda corto en algún módulo, hay que migrar a Sonnet selectivamente.
