# Migracion a Azure - Fase 2

Esta fase queda documentada, no implementada.

## Mapeo

- Supabase Auth -> Microsoft Entra ID.
- Supabase Postgres -> Azure SQL o Postgres Flexible Server.
- Supabase Storage -> Azure Blob Storage.
- Claude API -> mantener proveedor externo o evaluar Azure OpenAI cuando aplique.
- Vercel -> Azure Static Web Apps + Azure Functions.
- n8n Cloud -> Azure Logic Apps o n8n en Azure Container Apps.
- Resend/Twilio -> Azure Communication Services donde cubra el canal requerido.

## Estrategia

Migrar modulo por modulo manteniendo contratos de paquetes y eventos. Primero auth y datos compartidos, despues documentos, luego procesos asincronos.

## Costos

La Fase 1 privilegia free tiers. Azure agrega costo fijo por base de datos, storage, funciones y observabilidad; se debe estimar con volumen real de documentos.
