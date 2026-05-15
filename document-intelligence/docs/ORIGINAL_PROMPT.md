# Prompt para Claude Code — Document Intelligence Agent (Regulatorio MX)

> **Cómo usar este prompt:** abre Claude Code en un directorio limpio (`mkdir ~/dev/jvp && cd ~/dev/jvp`) y pega este documento completo como tu primer mensaje. Claude Code debe leerlo de principio a fin antes de hacer cualquier acción.

---

## 0. Tu rol y misión

Eres un **Staff Engineer full-stack** especializado en SaaS B2B, multi-tenancy y compliance regulatorio mexicano. Tu misión es construir, probar y desplegar end-to-end un producto SaaS llamado **JVP Document Intelligence** con tres módulos independientes, dejándolo funcionando en producción con datos de prueba realistas.

**Principio rector:** "Modular, multi-tenant, reproducible." Cada módulo debe poder eliminarse sin romper los otros. Todo el deploy debe poder repetirse desde cero corriendo un solo script.

**Restricciones absolutas:**
- Stack obligatorio (sin agregar dependencias mayores sin avisar): Next.js 15 (App Router), TypeScript estricto, Supabase (Postgres + Auth + Storage + RLS + Edge Functions), Vercel, n8n, GitHub, Anthropic Claude (Haiku 4.5 default, Sonnet como fallback), OpenAI (solo embeddings `text-embedding-3-small`), Resend (email), Twilio (WhatsApp), Mastra (orquestación multi-agente solo donde aplique), Turborepo + pnpm.
- **Nada de Azure, AAVA, AWS, GCP en esta fase.** Diseña pensando en migración a Azure como Fase 2 pero no la implementes.
- Todo en free tiers donde sea posible. Si una decisión obliga a un tier pagado, **avísale al usuario antes**.
- Idioma de la app: **español de México**. Idioma del código y comentarios: inglés. Idioma de docs README: español.

---

## 1. PASO 0 — Information Gathering (OBLIGATORIO antes de cualquier código)

**🛑 NO ESCRIBAS UNA LÍNEA DE CÓDIGO HASTA TERMINAR ESTA SECCIÓN.**

Presenta al usuario un único cuestionario consolidado. Acepta respuestas en cualquier orden y vuelve a preguntar solo lo que falte. Después de recibir respuestas, **muestra un resumen y pide confirmación explícita** antes de proceder.

### Información requerida

**A. Identidad del proyecto**
1. Nombre legal de la empresa (para footers/legales): *(default: Sistemas Informáticos JVP)*
2. Email del usuario admin global del sistema
3. Dominio personalizado para Vercel (opcional, ej. `compliance.jvp.mx`)
4. Color primario de marca (hex, default: `#0F172A`)

**B. Cuentas y credenciales — pide token / API key uno por uno**
5. `GITHUB_TOKEN` — PAT clásico con scopes `repo` + `workflow`, o confirma que `gh auth status` ya está autenticado
6. `VERCEL_TOKEN` — desde vercel.com/account/tokens, o confirma `vercel whoami`
7. `SUPABASE_ACCESS_TOKEN` — desde supabase.com/dashboard/account/tokens
8. `SUPABASE_PROJECT_REGION` — sugerir `us-east-1` (más cercano a MX, free tier disponible)
9. `ANTHROPIC_API_KEY`
10. `OPENAI_API_KEY` (solo para embeddings)
11. `RESEND_API_KEY` (resend.com — free tier 100 emails/día)
12. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (sandbox `whatsapp:+14155238886` es válido)
13. **Google OAuth**: Client ID + Client Secret (de console.cloud.google.com → OAuth 2.0 Client ID, tipo "Web application")
14. **Microsoft OAuth**: Application (client) ID + Client Secret + Tenant ID (de entra.microsoft.com → App registrations; tenant puede ser `common` para multi-tenant)

**C. Decisión de hosting de n8n**
15. Pregunta: "¿Cómo quieres correr n8n? (a) n8n Cloud (más fácil, $20 USD/mes), (b) self-hosted en Hetzner/DigitalOcean ($5 USD/mes, requiere setup), (c) por ahora simular workflows con cron en Vercel + Supabase pg_cron (gratis, suficiente para MVP)". **Default: opción (c).**

**D. Datos de prueba**
16. Pregunta: "¿Generar datos sintéticos automáticamente o esperar a que el usuario suba documentos reales?" **Default: generar 5 contratistas, 8 CFDIs, 3 contratos sintéticos para validar end-to-end.**

### Respuesta esperada

Después de recolectar todo, escribe un resumen tipo:

```
═══ RESUMEN DE CONFIGURACIÓN ═══
Proyecto:     JVP Document Intelligence
Admin email:  mario@example.com
GitHub repo:  github.com/USER/ia-projects → document-intelligence/
Supabase:     us-east-1
Vercel:       jvp-doc-intelligence.vercel.app
OAuth:        Google ✅  Microsoft ✅
n8n:          pg_cron (Fase 1) → migrar después
Test data:    Generar automáticamente

¿Procedo con esta configuración? (sí / ajustar)
```

Solo procede al PASO 1 después de un "sí" explícito.

---

## 2. PASO 1 — Repositorio y estructura

### Repo en GitHub

- Si **no existe** `github.com/USER/ia-projects`: crea un repo público vacío llamado `ia-projects` con un README de presentación. Este será el repo monorepo para todos los proyectos de IA del usuario.
- Si **ya existe**: clónalo y trabaja dentro.
- Dentro del repo, crea la carpeta `document-intelligence/` que es donde vive este proyecto.

### Estructura interna obligatoria

```
ia-projects/
└── document-intelligence/
    ├── apps/
    │   └── web/                           Next.js 15 (App Router) - única app desplegada
    │       ├── app/
    │       │   ├── (marketing)/           Landing page pública
    │       │   ├── (auth)/                /login, /signup, /callback
    │       │   ├── (app)/                 Layout autenticado con sidebar
    │       │   │   ├── dashboard/         Vista global con métricas de los 3 módulos
    │       │   │   ├── cfdi/              [Módulo 1]
    │       │   │   ├── laboral/           [Módulo 2]
    │       │   │   ├── contratos/         [Módulo 3]
    │       │   │   ├── settings/
    │       │   │   └── admin/             Solo accesible si is_admin = true
    │       │   ├── portal/[token]/        Portal público sin auth (contratistas suben docs)
    │       │   └── api/
    │       │       ├── auth/
    │       │       ├── webhooks/          Twilio inbound, Resend events
    │       │       └── modules/           Endpoints por módulo
    │       └── components/
    ├── packages/
    │   ├── shared-auth/                   Helpers de Supabase Auth + RBAC
    │   ├── shared-db/                     Cliente Supabase tipado + queries reutilizables
    │   ├── shared-ui/                     shadcn/ui + tema JVP
    │   ├── shared-agents/                 Cliente Claude unificado + retries + cache + observabilidad
    │   ├── shared-notifications/          Resend + Twilio wrappers
    │   └── modules/
    │       ├── cfdi/                      [Módulo 1] parsers, matchers, agentes
    │       ├── laboral/                   [Módulo 2] extractores, validators, compliance engine
    │       └── contratos/                 [Módulo 3] extractores, risk engine, Mastra workflows
    ├── supabase/
    │   ├── migrations/                    Una migración por feature
    │   ├── functions/                     Edge Functions (extract-cfdi, extract-laboral, etc.)
    │   ├── seed.sql                       Datos sintéticos
    │   └── config.toml
    ├── workflows/
    │   └── n8n/                           JSONs exportables de workflows
    ├── tests/
    │   ├── fixtures/                      PDFs, XMLs y contratos sintéticos
    │   ├── unit/
    │   └── e2e/                           Playwright
    ├── scripts/
    │   ├── setup.sh                       Provisioning inicial completo
    │   ├── seed.ts                        Carga datos de prueba
    │   └── teardown.sh                    Limpieza para empezar de cero
    ├── docs/
    │   ├── README.md                      Para usuarios finales
    │   ├── ARCHITECTURE.md
    │   ├── MODULES.md                     Spec funcional de cada módulo
    │   ├── DEPLOYMENT.md                  Pasos para redeploy desde cero
    │   ├── AZURE_MIGRATION.md             Plan de Fase 2
    │   └── DECISIONS/                     ADRs en formato MADR
    ├── .env.example                       Plantilla con TODAS las variables
    ├── .github/workflows/
    │   ├── ci.yml                         lint + typecheck + test en cada PR
    │   └── deploy.yml                     deploy automático a Vercel en push a main
    ├── turbo.json
    ├── pnpm-workspace.yaml
    ├── package.json
    └── README.md
```

### Regla de modularidad

Los tres módulos en `packages/modules/*` **no se importan entre sí jamás**. Solo dependen de `shared-*`. Si necesitas comunicación entre módulos, va por eventos vía tabla `system_events` en Supabase, no por imports directos. Esto permite borrar un módulo entero borrando su carpeta.

---

## 3. PASO 2 — Schema de base de datos (Supabase)

Genera **una migración por área**. Mínimo estas tablas, con RLS habilitado en TODAS:

### Tablas compartidas (siempre)

- `workspaces` — un workspace por cuenta (cada usuario nuevo crea el suyo en signup)
- `workspace_members` — pivote `user_id ↔ workspace_id` con `role` (`owner`, `admin`, `analyst`, `viewer`)
- `profiles` — extiende `auth.users` con `display_name`, `avatar_url`, `is_platform_admin` (boolean — solo true para el email admin global)
- `api_keys` — keys generadas por usuarios para integraciones
- `system_events` — bus interno entre módulos
- `audit_log` — bitácora completa, append-only
- `documents` — registro central de cualquier archivo subido (compartido por los 3 módulos), con campo `module text not null check (module in ('cfdi','laboral','contratos'))` y `document_subtype` específico

### Tablas Módulo 1 (CFDI)

- `cfdi_xmls` — XMLs parseados (UUID SAT, emisor RFC, receptor RFC, total, fecha, tipo comprobante)
- `bank_statements` — estado de cuenta con metadata (banco, periodo, cuenta)
- `bank_transactions` — transacciones individuales (fecha, concepto, monto, referencia)
- `reconciliations` — corridas de conciliación
- `reconciliation_matches` — relación cfdi ↔ transaction con `match_type` (`exact`, `fuzzy`, `llm_inferred`, `manual`) y `confidence`

### Tablas Módulo 2 (Laboral)

Usa el schema que ya tienes en `supabase-schema.sql` que generé antes pero con prefijo `laboral_` para evitar colisión, y enlazado a `workspaces` no a `organizations`:
- `laboral_contractors`
- `laboral_extractions`
- `laboral_compliance_status`
- `laboral_alerts`

### Tablas Módulo 3 (Contratos)

- `contracts` — metadata del contrato (título, partes, tipo, fecha, monto)
- `contract_clauses` — cláusulas extraídas con tipo (`indemnizacion`, `terminacion`, `confidencialidad`, etc.)
- `contract_risks` — riesgos identificados con `severity` (`low`, `medium`, `high`, `critical`) y `recommendation`
- `contract_embeddings` — pgvector para RAG (búsqueda de cláusulas similares en histórico)
- `contract_templates` — biblioteca de cláusulas de referencia para comparación

### Reglas de RLS (críticas)

```sql
-- Patrón para TODAS las tablas con workspace_id:
create policy "members read"
  on <tabla> for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
    OR (select is_platform_admin from profiles where id = auth.uid())
  );

create policy "members write"
  on <tabla> for all
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role in ('owner','admin','analyst')
    )
    OR (select is_platform_admin from profiles where id = auth.uid())
  );
```

El admin global (definido por email en variable `PLATFORM_ADMIN_EMAIL`) tiene `is_platform_admin = true` y atraviesa TODAS las RLS. Esta flag se asigna automáticamente cuando el usuario con ese email hace signup.

---

## 4. PASO 3 — Autenticación y multi-tenancy

### Proveedores OAuth

Habilita en Supabase Auth:
- Email + magic link (siempre)
- Google OAuth
- Microsoft OAuth (Azure AD) — usar `Common` tenant para soportar cuentas personales y corporativas

### Flujo de signup

1. Usuario se autentica con OAuth o magic link
2. Trigger SQL `handle_new_user()` se dispara:
   - Crea fila en `profiles`
   - Si email == `PLATFORM_ADMIN_EMAIL` → `is_platform_admin = true`
   - Crea un `workspace` con nombre default `"Workspace de {display_name}"`
   - Crea `workspace_members` con `role = 'owner'`
3. Usuario aterriza en `/dashboard` con su workspace listo

### Workspace switcher

En el sidebar, dropdown para cambiar entre workspaces si el usuario es miembro de varios. El `workspace_id` activo se guarda en cookie `active_workspace_id` y se lee en cada query.

### Vista de admin

Ruta `/admin` (solo visible si `is_platform_admin = true`):
- Lista de **todos** los workspaces con métricas (usuarios, docs procesados, último login)
- Impersonation: botón "Ver como" que cambia el contexto al workspace seleccionado (con banner rojo "Modo admin — viendo workspace de X")
- Métricas globales: costo acumulado de Claude API, número de documentos procesados, errores recientes

---

## 5. PASO 4 — Módulo 1: Conciliación CFDI ↔ Estados de cuenta

### Funcionalidad

1. **Carga de CFDIs**: drag-and-drop de uno o varios XMLs. Parsing determinístico con `fast-xml-parser` (no usar LLM aquí). Validar firma con `node-forge` (opcional, marcar TODO si toma > 1h).
2. **Carga de estados de cuenta**: aceptar CSV de BBVA, Santander, Banamex (3 formatos hardcoded) + PDF como fallback (usar Claude Haiku visión para extraer transacciones).
3. **Conciliación en 3 pasadas**:
   - Pass 1 — **Match exacto**: monto idéntico + ventana de fecha ± 3 días
   - Pass 2 — **Match difuso**: monto ± 1 peso (redondeos) + ventana ± 5 días + similitud de texto en concepto/RFC
   - Pass 3 — **LLM inference**: para transacciones no matcheadas, mandar a Claude Haiku con contexto de CFDIs candidatos para sugerir match con razonamiento. Confidence threshold 0.7 → match automático, < 0.7 → requiere revisión.
4. **Dashboard**: tabla de reconciliación con filtros (matcheado / pendiente / sospechoso). Export Excel con xlsx-populate.

### Stack específico
- Parser XML: `fast-xml-parser`
- LLM: Claude Haiku 4.5
- Sin Mastra (un solo agente, no se justifica)

### Test fixtures a generar
- 8 CFDIs sintéticos válidos según SAT 4.0 (4 ingresos, 4 egresos, RFCs ficticios pero con dígito verificador correcto)
- 1 CSV BBVA con 15 transacciones (10 que matchean, 3 difusos, 2 sin CFDI)
- Script de seed que los carga al workspace de prueba

---

## 6. PASO 5 — Módulo 2: Cumplimiento Laboral (REPSE/IMSS/INFONAVIT)

### Funcionalidad

Usa la especificación de `supabase-schema.sql` y `extraction-prompts.md` que ya generé. Adáptala a workspaces (no organizations).

**Features mínimos:**
1. CRUD de contratistas (RFC, razón social, contacto, status)
2. Upload de los 5 documentos: REPSE, SAT 32-D, IMSS 32-D, INFONAVIT, CSF
3. Extracción con Claude Haiku visión directa sobre PDF (sin OCR previo)
4. Portal del contratista vía token único (URL pública, sin signup)
5. Dashboard semáforo por contratista (4 columnas de color)
6. Alertas automáticas: 7 días antes de expirar (email + WhatsApp opcional)
7. Export Excel con estado de cumplimiento

### Stack específico
- LLM: Claude Haiku 4.5 con visión sobre PDF
- Notificaciones: Resend + Twilio
- Cron de alertas: `pg_cron` (corre diario a las 8am MX)

### Test fixtures
- 5 contratistas sintéticos con estados variados:
  - 1 totalmente compliant
  - 1 con REPSE expirando en 3 días
  - 1 con IMSS expirado hace 5 días
  - 1 sin INFONAVIT subido (missing)
  - 1 con SAT con sentido "negativo" (invalid)
- PDFs sintéticos generados con `pdf-lib` simulando los formatos reales (logos placeholder, datos ficticios coherentes)

---

## 7. PASO 6 — Módulo 3: Análisis de contratos y due diligence

### Funcionalidad

1. **Upload de contrato**: PDF o DOCX. Conversión a texto con `pdf-parse` / `mammoth`.
2. **Pipeline multi-agente con Mastra**:
   - **Agente 1 — Extractor**: identifica partes, fechas, montos, vigencia, jurisdicción, tipo de contrato
   - **Agente 2 — Clausulador**: clasifica cada cláusula (indemnización, no compete, propiedad intelectual, terminación, confidencialidad, fuerza mayor, etc.)
   - **Agente 3 — Risk Analyzer**: marca cláusulas riesgosas comparándolas con templates de referencia (RAG sobre `contract_templates`)
   - **Agente 4 — Reporter**: genera resumen ejecutivo en español con bullets de riesgos, recomendaciones y semáforo global
3. **Vista de contrato**: PDF viewer (iframe) con cláusulas resaltadas por color según severidad, panel lateral con el reporte ejecutivo.
4. **RAG sobre histórico**: el cliente puede preguntar "¿hay cláusulas similares a esta en otros contratos?" → búsqueda semántica con pgvector.

### Stack específico
- Mastra para orquestar los 4 agentes
- Embeddings: OpenAI `text-embedding-3-small` (más barato y suficiente)
- pgvector en Supabase
- LLM principal: Claude Haiku 4.5 (extracción) + Sonnet 4.5 solo para Agente 3 (risk analysis requiere razonamiento más fino)

### Test fixtures
- 3 contratos sintéticos en PDF:
  - Contrato de servicios profesionales (mediano riesgo, cláusula de no compete agresiva)
  - NDA bilateral (bajo riesgo)
  - Contrato de prestación con subcontratación (alto riesgo, falta cláusula REPSE)
- 10 cláusulas template precargadas en `contract_templates`

---

## 8. PASO 7 — Frontend / UX

### Stack UI
- Tailwind v4 + shadcn/ui
- `lucide-react` para iconos
- `sonner` para toasts
- `nuqs` para query params tipados
- `react-hook-form` + `zod` para forms
- Tema oscuro/claro con `next-themes`

### Páginas obligatorias

1. **Landing pública** (`/`) — hero, 3 módulos, pricing placeholder, CTA "Empezar gratis"
2. **Auth** (`/login`, `/signup`, `/auth/callback`) — botones de Google, Microsoft, magic link
3. **Dashboard** (`/dashboard`) — métricas de los 3 módulos en cards, últimas alertas, accesos rápidos
4. **Módulo CFDI** (`/cfdi`) — lista de conciliaciones, botón "Nueva conciliación", detalle con tabla
5. **Módulo Laboral** (`/laboral`) — lista de contratistas con semáforo, detalle con tabs (docs, historial, alertas)
6. **Módulo Contratos** (`/contratos`) — lista de contratos con risk badge, detalle con viewer + reporte
7. **Settings** (`/settings`) — perfil, workspace, miembros invitados, API keys, integraciones, billing placeholder
8. **Admin** (`/admin`) — solo platform admin, lista de workspaces + métricas globales

### Componentes compartidos

- `<DocumentDropzone>` reutilizable por los 3 módulos
- `<ComplianceBadge level="compliant|expiring|expired|invalid|missing">`
- `<EmptyState>` con CTA específico
- `<DataTable>` con paginación, filtros y export

---

## 9. PASO 8 — n8n y notificaciones

### Workflows a crear (como archivos JSON en `workflows/n8n/`)

1. `daily-compliance-check.json` — corre 8am MX, busca contratistas con docs expirando en 7 días, dispara `send-alert` por cada uno
2. `contractor-portal-reminder.json` — corre lunes 9am MX, recuerda al contratista subir docs faltantes
3. `weekly-summary-email.json` — corre viernes 5pm MX, manda resumen semanal al owner del workspace

### Importante
- Para Fase 1 (default), implementa estos workflows como **funciones SQL ejecutadas con `pg_cron`** dentro de Supabase. Más simple, gratis, sin n8n.
- Deja los JSONs de n8n exportados para cuando el usuario quiera migrar.

### Templates de email (Resend)
- `alert-document-expiring.tsx` (React Email)
- `alert-document-expired.tsx`
- `weekly-summary.tsx`
- `welcome.tsx`
- `contractor-portal-invitation.tsx`

### Templates de WhatsApp (Twilio)
- Mensajes en texto plano cortos (≤ 400 chars), siempre con link de vuelta a la app
- Sandbox de Twilio funciona para todos los tests

---

## 10. PASO 9 — Testing y datos sintéticos

### Tests obligatorios

- **Unit tests** (vitest): parsers XML, lógica de matching, validators de RFC, cálculo de compliance level
- **Integration tests**: cada Edge Function con mock de Claude API
- **E2E tests** (Playwright): flujo completo signup → upload doc → ver resultado, por cada módulo
- **Smoke test** post-deploy: script que pega contra el deploy de Vercel y verifica que todo responde 200

### Datos sintéticos

Script `scripts/seed.ts` que:
1. Crea 3 workspaces de prueba: `Demo Constructora SA`, `Demo Maquiladora MX`, `Demo Despacho Contable`
2. Cada workspace recibe sus fixtures correspondientes
3. Genera al admin global como miembro de los 3 con rol `viewer` para testing
4. Idempotente: borrarlo y volverlo a correr deja el estado limpio

### Coverage mínimo
- Unit: 60% en `packages/modules/*`
- E2E: 1 happy path por módulo

---

## 11. PASO 10 — Deploy y CI/CD

### GitHub Actions

`.github/workflows/ci.yml`:
- Lint (eslint + prettier)
- Typecheck (tsc --noEmit)
- Unit tests
- Build de Next.js

`.github/workflows/deploy.yml`:
- Trigger: push a `main`
- Job 1: aplicar migraciones de Supabase (`supabase db push`)
- Job 2: deploy a Vercel (`vercel --prod`)
- Job 3: smoke tests post-deploy
- Notificación a Resend si falla

### Vercel
- Conectar al repo
- Configurar variables de entorno desde `.env.example`
- Habilitar protección de preview deployments (auth requerida para previews)

### Reproducibilidad
`scripts/setup.sh` debe poder, desde cero:
1. Crear el proyecto Supabase via CLI
2. Aplicar todas las migraciones
3. Crear bucket `documents` privado en Storage
4. Configurar providers de Auth (Google, Microsoft) — generar instrucciones manuales si CLI no soporta
5. Sembrar datos sintéticos
6. Crear proyecto en Vercel + linkear repo
7. Subir todas las env vars a Vercel
8. Triggerear primer deploy
9. Imprimir URL final + credenciales de prueba

---

## 12. PASO 11 — Documentación obligatoria

### `README.md` (raíz del proyecto)
- Qué es JVP Document Intelligence (2 párrafos)
- Quick start (3 comandos)
- Links a docs detalladas
- Screenshots o GIFs de cada módulo

### `docs/ARCHITECTURE.md`
- Diagrama Mermaid de la arquitectura
- Decisiones clave (por qué Supabase, por qué Mastra solo en módulo 3, etc.)
- Cómo agregar un módulo nuevo (paso a paso)

### `docs/DEPLOYMENT.md`
- Pasos para redeploy desde cero
- Cómo rotar credenciales
- Cómo hacer rollback

### `docs/AZURE_MIGRATION.md` (Fase 2)
Sección no implementada, pero documentada como roadmap:
- Mapeo de servicios: Supabase Auth → Microsoft Entra ID + Azure SQL; Supabase Storage → Azure Blob; Claude API → mantener (sin equivalente nativo Azure que cumpla) o Azure OpenAI; Vercel → Azure Static Web Apps + Azure Functions; n8n → Azure Logic Apps o n8n en Azure Container Apps; Resend → Azure Communication Services; Twilio → Azure Communication Services SMS/WhatsApp
- Estrategia de migración por módulo (cada uno migrable independientemente)
- Estimación de costos comparativa

### ADRs (`docs/DECISIONS/`)
Como mínimo crear:
- `001-monorepo-turborepo.md`
- `002-supabase-vs-azure-phase1.md`
- `003-claude-haiku-default-model.md`
- `004-mastra-only-for-contracts.md`
- `005-multi-tenancy-with-workspaces.md`

---

## 13. Criterios de aceptación

Al terminar, **antes de declarar "done"**, verifica TODOS estos puntos:

- [ ] Repo `ia-projects` existe en GitHub con la carpeta `document-intelligence/`
- [ ] `pnpm install && pnpm dev` levanta la app en `localhost:3000` sin errores
- [ ] Login con Google funciona end-to-end
- [ ] Login con Microsoft funciona end-to-end
- [ ] Login con magic link (email) funciona
- [ ] Signup de usuario nuevo crea workspace automáticamente
- [ ] Usuario admin (email configurado) ve `/admin` con la lista de workspaces
- [ ] Usuario normal NO puede acceder a `/admin` (redirect a `/dashboard`)
- [ ] Módulo 1: carga XML CFDI → aparece en lista; carga CSV BBVA → conciliación corre
- [ ] Módulo 2: crea contratista → sube PDF → extracción funciona → semáforo se actualiza
- [ ] Módulo 3: sube contrato PDF → pipeline Mastra corre → reporte aparece
- [ ] RLS impide ver datos de otros workspaces (validar con dos cuentas de prueba)
- [ ] `pnpm test` pasa todos los tests
- [ ] `pnpm build` compila sin errores ni warnings
- [ ] Deploy a Vercel funciona y la URL pública carga
- [ ] Las alertas programadas (pg_cron) están registradas
- [ ] `.env.example` lista TODAS las variables sin valores reales
- [ ] README tiene screenshots o al menos descripciones claras de cada pantalla
- [ ] `scripts/setup.sh` corre de principio a fin sin intervención manual (excepto inputs documentados)
- [ ] `scripts/teardown.sh` deja todo limpio para empezar de cero

---

## 14. Protocolo de ejecución

1. **Lee este prompt completo antes de actuar.**
2. Ejecuta PASO 0 (information gathering). NO sigas sin confirmación.
3. Anuncia cada PASO antes de empezar y al terminar.
4. Commit en GitHub al final de cada PASO con mensaje semántico (`feat(module-1): cfdi parser implementado`).
5. Si encuentras un blocker (credencial faltante, decisión ambigua, problema técnico inesperado), **detente y pregunta**. No improvises.
6. Si tomas una decisión técnica importante no especificada, crea un ADR para documentarla.
7. Al final, imprime un **handoff report** con:
   - URL de producción
   - URL del repo
   - Credenciales de prueba (3 workspaces sintéticos)
   - Costo estimado mensual (suma de free tiers + costos variables esperados)
   - Próximos 3 pasos sugeridos para iterar

---

## 15. Manejo de errores comunes

- **Supabase region no disponible en free tier**: probar siguiente región más cercana (us-west)
- **OAuth callback URL incorrecta**: documentar la URL exacta a registrar en Google/Microsoft (`https://<vercel-url>/auth/callback`)
- **pgvector no habilitado**: incluir en la primera migración `create extension if not exists vector;`
- **Claude API rate limit**: implementar retry con exponential backoff en `shared-agents`, max 3 intentos
- **Twilio sandbox requiere opt-in**: documentar que el número del receptor debe mandar "join <code>" al sandbox antes de recibir mensajes
- **Vercel build out of memory**: ya está manejado por Turborepo cache, pero si pasa, reducir paralelismo a 2

---

## 16. Lo que NO debes hacer

- ❌ No instales librerías "por si acaso". Si no se usa en código del MVP, fuera.
- ❌ No uses `any` en TypeScript. Tipos estrictos siempre.
- ❌ No hardcodees secrets — todo va a `.env` y a Vercel env vars.
- ❌ No hagas commits con secrets accidentales — instala y configura `gitleaks` en pre-commit.
- ❌ No saltes el information gathering del PASO 0. Aunque "creas saber" la respuesta, pregunta.
- ❌ No marques tests como `skip` para hacer pasar CI. Si un test falla, arregla la causa.
- ❌ No mezcles lógica entre módulos. Si dudas, ADR.
- ❌ No declares "done" sin haber corrido el checklist completo.

---

**Empieza ahora con el PASO 0.**
