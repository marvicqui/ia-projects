# @jvp/module-contratos

Módulo de análisis de contratos. **Schema + pgvector desplegado, pipeline pendiente.**

## Scope (próxima sesión)

1. **Conversión a texto**: PDF con `pdf-parse`, DOCX con `mammoth`.

2. **Pipeline multi-agente con Mastra**:
   - **Extractor**: partes, fechas, montos, vigencia, jurisdicción → `contracts` row.
   - **Clausulador**: split por cláusulas + clasificación → `contract_clauses` rows.
   - **Risk Analyzer** (Sonnet 4.6): por cada cláusula riesgosa, compara con `contract_templates` (RAG con pgvector) → `contract_risks` rows.
   - **Reporter**: genera `executive_summary` y `overall_risk`.

3. **Embeddings**: para cada cláusula, generar embedding con OpenAI `text-embedding-3-small` y guardar en `contract_embeddings`. Permite búsqueda semántica.

4. **Vista de contrato** `/contratos/[id]`:
   - PDF viewer (iframe del archivo en Storage).
   - Panel lateral: resumen + lista de riesgos por severity.
   - Cláusulas con coloreado.

5. **RAG endpoint** `/api/contratos/search`: query → embedding → cosine similarity sobre `contract_embeddings`.

## Tablas (ya existentes)

- `contracts` — header del contrato + summary + overall_risk
- `contract_clauses` — cláusulas extraídas
- `contract_risks` — riesgos identificados con severity
- `contract_embeddings` — pgvector(1536)
- `contract_templates` — biblioteca de referencia (null workspace_id = global)

## Templates iniciales

Precargar 10 cláusulas template en `contract_templates` con `workspace_id = NULL`:
- Indemnización razonable
- No compete con scope limitado
- Terminación con causa
- Confidencialidad bilateral
- IP work-for-hire
- Fuerza mayor estándar
- Jurisdicción CDMX/arbitraje
- Pago neto 30
- REPSE compliance clause
- Subcontratación con notificación
