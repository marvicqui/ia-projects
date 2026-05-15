# ADR 004 — Mastra solo en módulo Contratos

- **Status:** Accepted
- **Date:** 2026-05-14

## Contexto

Mastra es un framework para orquestar agentes con steps, workflows, retries. Es excelente para pipelines de múltiples LLM calls con dependencia entre sí, pero añade complejidad para tareas single-call.

## Decisión

- **Módulo CFDI**: Sin Mastra. Llamada única a Claude para pass 3 (`inferMatchesWithLlm`).
- **Módulo Laboral**: Sin Mastra. Una extracción por documento, paralelizable manualmente con `Promise.all`.
- **Módulo Contratos**: **Sí Mastra**. Pipeline real de 4 agentes (Extractor → Clausulador → Risk Analyzer → Reporter), con outputs intermedios que alimentan al siguiente.

## Consecuencias

- **+** Complejidad de Mastra solo donde aporta valor.
- **+** Módulos 1 y 2 quedan más fáciles de debuggear (vanilla TypeScript).
- **−** Inconsistencia entre módulos puede confundir al onboarding.
