# Migración a Azure (Fase 2)

> **Estado:** No implementada. Documento como roadmap.

## Por qué Fase 2 ≠ Fase 1

JVP cliente final puede requerir compliance con su política de datos en Azure (Microsoft 365 stack). Fase 1 sigue en Vercel + Supabase porque:

- Time-to-market: setup en horas, no semanas.
- Costo: free tier suficiente para validar producto.
- Velocidad de iteración: Supabase Studio + Vercel preview deploys son inmejorables.

Cuando un cliente exige Azure o el volumen lo justifique, esta guía aplica.

## Mapeo de servicios

| Capa                       | Fase 1                              | Fase 2 (Azure)                                              |
|----------------------------|-------------------------------------|-------------------------------------------------------------|
| Auth                       | Supabase Auth (GoTrue)              | Microsoft Entra ID (B2B + B2C tenants)                      |
| Base de datos              | Supabase Postgres                   | Azure SQL Database o Azure Database for PostgreSQL          |
| RLS                        | Supabase RLS policies               | Postgres RLS (igual) o Row-Level Security en Azure SQL      |
| Storage de docs            | Supabase Storage (bucket privado)   | Azure Blob Storage (private container + SAS tokens)         |
| App hosting                | Vercel                              | Azure Static Web Apps (frontend) + Azure Functions (API)    |
| Edge functions             | Supabase Edge Functions (Deno)      | Azure Functions (Node)                                      |
| Scheduler                  | n8n Cloud + pg_cron                 | Azure Logic Apps o n8n self-hosted en Container Apps        |
| Email                      | Resend                              | Azure Communication Services Email                          |
| WhatsApp / SMS             | Twilio                              | Azure Communication Services SMS + Twilio (no hay WA Azure nativo) |
| LLM                        | Anthropic Claude direct             | Mantener Anthropic direct (no hay Claude en Azure aún)      |
| Embeddings                 | OpenAI text-embedding-3-small       | Azure OpenAI text-embedding-3-small                         |
| Observabilidad             | Vercel logs                         | Azure Application Insights + Log Analytics                  |
| Secrets                    | Vercel env vars                     | Azure Key Vault                                             |

## Estrategia de migración por módulo

La modularidad estricta del proyecto permite migración incremental:

1. **Empezar por el módulo de menos volumen** (probablemente Contratos al inicio).
2. Cada módulo puede correr en proveedores diferentes mientras se migra. Comunicación entre módulos solo via `system_events` → puede ser una tabla en Supabase o una cola Azure Service Bus.
3. Workspaces se replican vía CDC (Azure Database Migration Service tiene conectores Supabase→Azure SQL).

## Pasos macro

1. **Discovery (1-2 sem)**: cliente confirma SKU de Azure SQL (Hyperscale vs Business Critical), región (México Central o East US 2 para baja latencia).
2. **Auth migration (2-3 sem)**: setup Entra ID, SCIM provisioning, migrar usuarios (export Supabase → import Entra).
3. **DB migration (3-4 sem)**: schema port (algunas funciones Supabase como `auth.uid()` requieren adaptación). RLS policies mayormente compatibles.
4. **Storage migration (1 sem)**: copia con `azcopy`, actualizar URLs en `documents.storage_path`.
5. **Compute migration (2-3 sem)**: Next.js a Azure Static Web Apps; route handlers a Azure Functions.
6. **Cutover (1 sem)**: DNS, monitoring, rollback plan.

**Total estimado:** 10-14 semanas para los 3 módulos.

## Comparación de costos (mensual, asumiendo 50 workspaces × 10k docs/mes)

| Item                    | Vercel/Supabase | Azure        |
|-------------------------|-----------------|--------------|
| Compute                 | $20 (Vercel Pro)| $80          |
| Database (50GB)         | $25 (Supabase Pro) | $150 (SQL Hyperscale 1vCore) |
| Storage (200GB)         | Included        | $5 (Blob LRS) |
| Email (5k/mes)          | $20 (Resend)    | $5 (ACS)     |
| WhatsApp (1k/mes)       | $5 (Twilio)     | $5 (Twilio sigue)|
| LLM API                 | $50 (igual)     | $50 (igual)  |
| **Total**               | **~$120**       | **~$295**    |

Azure es ~2.5x más caro a este volumen. Justificado solo si el cliente lo exige.
