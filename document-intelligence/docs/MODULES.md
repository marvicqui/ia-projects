# Especificación de módulos

## Módulo 1 — Conciliación CFDI ↔ Estados de cuenta

**Estado:** ✅ Implementado end-to-end.

### Inputs
- Multiple CFDIs XML (SAT 4.0 format).
- 1 estado de cuenta bancario en CSV (BBVA, Santander o Banamex).

### Output
- Tabla de matches (`reconciliation_matches`) con `match_type` (exact/fuzzy/llm_inferred/manual), `confidence`, `review_status` (auto/pending/confirmed/rejected), `rationale`.
- Excel export con 4 hojas.

### Algoritmo (3 pasadas)

| Pass | Criterio | Confidence | Review status default |
|------|----------|------------|------------------------|
| 1. Exact | Monto idéntico ±0.01 + fecha ±3 días + dirección consistente | 1.0 | `auto` |
| 2. Fuzzy | Monto ±1 peso + fecha ±5 días + sim(texto) ≥ 0.55 | Score combinado 0.55*texto + 0.30*monto + 0.15*fecha | `auto` si ≥ 0.75, sino `pending` |
| 3. LLM | Claude Haiku con candidatos no resueltos | Determinado por el LLM | `auto` si ≥ threshold (0.7) |

### Detección de dirección
- CFDI `tipo I` con `emisor_rfc == ourRfc` → ingreso (`isCredit: true` en bank tx).
- CFDI `tipo E|I` con `receptor_rfc == ourRfc` → egreso.

---

## Módulo 2 — Cumplimiento Laboral

**Estado:** 🚧 Schema desplegado, lógica pendiente.

Ver [packages/modules/laboral/README.md](../packages/modules/laboral/README.md).

---

## Módulo 3 — Análisis de Contratos

**Estado:** 🚧 Schema + pgvector desplegado, pipeline Mastra pendiente.

Ver [packages/modules/contratos/README.md](../packages/modules/contratos/README.md).

---

## Cross-cutting: comunicación entre módulos

Los módulos **no se importan**. Si Módulo A necesita reaccionar a algo de Módulo B, escriben/leen `system_events`:

```typescript
// Módulo A emite:
await supabase.from('system_events').insert({
  workspace_id,
  topic: 'cfdi.reconciliation.completed',
  source_module: 'cfdi',
  payload: { reconciliationId, stats }
});

// Módulo B suscribe via polling o pg_notify:
const { data } = await supabase
  .from('system_events')
  .select('*')
  .eq('topic', 'cfdi.reconciliation.completed')
  .gte('created_at', lastCheckpoint);
```

(En Fase 2 esto puede migrar a Supabase Realtime o Azure Service Bus.)
