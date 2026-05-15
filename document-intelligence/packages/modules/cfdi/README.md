# @jvp/module-cfdi

Módulo de conciliación CFDI ↔ estados de cuenta bancarios.

## Estado: ✅ Implementado end-to-end

## Componentes

- **Parsers**: `parseCfdiXml` (SAT 4.0) + `parseBbvaCsv` / `parseSantanderCsv` / `parseBanamexCsv`.
- **Matcher de 3 pasadas** (`matcher.ts`):
  - **Pass 1 — Exact**: monto idéntico, fecha ±3 días, dirección consistente (ingreso/egreso).
  - **Pass 2 — Fuzzy**: monto ±1 peso, fecha ±5 días, similitud de texto Dice ≥ 0.55, score combinado.
  - **Pass 3 — LLM** (`inferMatchesWithLlm`): Claude Haiku con candidatos no resueltos, threshold 0.7 para auto-confirm.
- **Excel export**: `buildReconciliationWorkbook` con 4 hojas (Matches, CFDIs sin emparejar, Tx sin emparejar, Resumen).

## API endpoints

- `POST /api/cfdi/upload` — `kind=cfdi|bank` + multipart files
- `POST /api/cfdi/reconcile` — `{ statementId, ourRfc, enableLlm }`

## UI

- `/cfdi` — lista de conciliaciones recientes
- `/cfdi/new` — formulario de carga + run

## Tests

- `src/__tests__/matcher.test.ts` — vitest unit tests de las reglas exact/fuzzy

## Seed sintético

`scripts/seed.ts` genera 20 CFDIs + 1 CSV BBVA con 10 exact + 3 fuzzy + 2 unmatched.

## Pendientes (no críticos)

- [ ] Validación de firma SAT (`node-forge` over `Certificado` + `Sello`) — marcado como opcional en spec
- [ ] PDF fallback con Claude Haiku visión para CSVs no reconocidos
- [ ] Manual reconciliation UI (revisar/aceptar/rechazar matches `pending`)
- [ ] Detalle de reconciliación `/cfdi/[id]` con tabla filtrable
