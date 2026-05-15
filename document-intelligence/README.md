# JVP Document Intelligence

> SaaS B2B para compliance regulatorio mexicano. Tres módulos independientes en un solo monorepo: conciliación CFDI ↔ estados de cuenta, cumplimiento laboral (REPSE/IMSS/INFONAVIT/SAT) y análisis de contratos.

Multi-tenant por diseño (workspaces), construido sobre Next.js 15, Supabase y Anthropic Claude. Cada módulo es eliminable sin romper los otros.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # llena los valores
pnpm dev                     # arranca apps/web en http://localhost:3000
```

## Módulos

| # | Nombre   | Función                                                                       | Tech            |
|---|----------|-------------------------------------------------------------------------------|-----------------|
| 1 | CFDI     | Conciliación CFDI ↔ estado de cuenta bancario en 3 pasadas (exacto/fuzzy/LLM) | fast-xml-parser, Claude Haiku |
| 2 | Laboral  | Cumplimiento REPSE/IMSS/INFONAVIT/SAT 32-D/CSF + portal contratista           | Claude Haiku visión, Resend, Twilio |
| 3 | Contratos | Análisis de contratos y due diligence con RAG + pipeline multi-agente         | Mastra, pgvector, Claude Sonnet |

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Especificación funcional de módulos](docs/MODULES.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Migración a Azure (Fase 2)](docs/AZURE_MIGRATION.md)
- [Decisiones técnicas (ADRs)](docs/DECISIONS/)

## Stack

- **Frontend**: Next.js 15 (App Router) · Tailwind v4 · shadcn/ui · TypeScript estricto
- **Backend**: Supabase (Postgres + Auth + Storage + RLS + Edge Functions)
- **IA**: Anthropic Claude (Haiku 4.5 default, Sonnet 4.6 fallback) · OpenAI embeddings · Mastra (módulo 3)
- **Infra**: Vercel · Turborepo · pnpm · n8n Cloud
- **Notificaciones**: Resend (email) · Twilio (WhatsApp)

## Licencia

Propietario — Marvicqui Inc © 2026
