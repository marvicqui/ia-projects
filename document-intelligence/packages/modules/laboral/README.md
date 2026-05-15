# @jvp/module-laboral

Módulo de cumplimiento laboral mexicano. **Schema desplegado, lógica pendiente.**

## Scope (próxima sesión)

1. **Extractores con Claude Haiku visión**: parser de PDF para REPSE, SAT 32-D, IMSS 32-D, INFONAVIT, CSF.
   Entrada: archivo PDF base64 → salida: `{ folio, emitted_at, expires_at, valid, raw_fields }`.

2. **Portal del contratista** (`/portal/[token]`):
   - URL pública sin auth, identificada por `portal_token` en `laboral_contractors`.
   - Dropzone de los 5 documentos.
   - Re-genera token por re-invitación.

3. **Recompute compliance**: el SQL `recompute_laboral_compliance()` ya existe en migración 0700.
   Llamarlo después de cada inserción en `laboral_extractions`.

4. **Alertas**:
   - 7 días antes de `expires_at` → Resend email + Twilio WhatsApp.
   - Templates: `alert-document-expiring.tsx`, `alert-document-expired.tsx`.
   - Scheduler: n8n Cloud workflow (export en `workflows/n8n/daily-compliance-check.json`).

5. **Dashboard `/laboral`**: tabla de contratistas con semáforo de 5 columnas (REPSE / SAT / IMSS / INFONAVIT / CSF), cada celda usa `<ComplianceBadge level="..." />`.

6. **Export Excel** con estado de cumplimiento, similar a `module-cfdi/excel-export.ts`.

## Tablas (ya existentes)

- `laboral_contractors` — contratistas con `portal_token` único
- `laboral_extractions` — 1 por documento subido, JSON con campos extraídos
- `laboral_compliance_status` — vista materializada lite, 1 fila por (contractor, doc_type)
- `laboral_alerts` — log de alertas enviadas

## Prompts de extracción (referencia)

Ver el prompt original del usuario en `docs/ORIGINAL_PROMPT.md` sección PASO 5.
Los prompts viven en `src/extractors/prompts.ts` (a crear).
