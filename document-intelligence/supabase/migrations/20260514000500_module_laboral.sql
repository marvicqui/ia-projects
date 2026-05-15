-- 20260514000500_module_laboral.sql
-- Module 2: Labor compliance (REPSE/IMSS/INFONAVIT/SAT 32-D/CSF) for Mexican contractors.

create type public.laboral_doc_type as enum ('repse', 'sat_32d', 'imss_32d', 'infonavit', 'csf');
create type public.compliance_level as enum ('compliant', 'expiring', 'expired', 'invalid', 'missing');
create type public.alert_channel as enum ('email', 'whatsapp');

create table if not exists public.laboral_contractors (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rfc text not null,
  razon_social text not null,
  contact_email text,
  contact_phone text,
  portal_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists idx_laboral_workspace_rfc on public.laboral_contractors(workspace_id, rfc);

create table if not exists public.laboral_extractions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contractor_id uuid not null references public.laboral_contractors(id) on delete cascade,
  doc_type public.laboral_doc_type not null,
  document_id uuid not null references public.documents(id) on delete cascade,
  extracted_data jsonb not null default '{}'::jsonb,
  emitted_at date,
  expires_at date,
  valid boolean not null default true,
  model_used text,
  confidence numeric(4, 3),
  created_at timestamptz not null default now()
);

create index if not exists idx_laboral_extractions_contractor on public.laboral_extractions(contractor_id, doc_type, created_at desc);

create table if not exists public.laboral_compliance_status (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contractor_id uuid not null references public.laboral_contractors(id) on delete cascade,
  doc_type public.laboral_doc_type not null,
  level public.compliance_level not null,
  days_until_expiry integer,
  last_extraction_id uuid references public.laboral_extractions(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (contractor_id, doc_type)
);

create table if not exists public.laboral_alerts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contractor_id uuid not null references public.laboral_contractors(id) on delete cascade,
  doc_type public.laboral_doc_type not null,
  channel public.alert_channel not null,
  message text not null,
  sent_at timestamptz not null default now(),
  delivered boolean not null default false,
  provider_id text
);

create index if not exists idx_laboral_alerts_contractor on public.laboral_alerts(contractor_id, sent_at desc);

alter table public.laboral_contractors enable row level security;
alter table public.laboral_extractions enable row level security;
alter table public.laboral_compliance_status enable row level security;
alter table public.laboral_alerts enable row level security;

create policy "laboral_contractors read" on public.laboral_contractors for select using (public.is_workspace_member(workspace_id));
create policy "laboral_contractors write" on public.laboral_contractors for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

-- contractor portal: contractors access via token URL without auth.
-- The portal endpoint bypasses RLS using service role; this policy is for in-app reads only.
create policy "laboral_extractions read" on public.laboral_extractions for select using (public.is_workspace_member(workspace_id));
create policy "laboral_extractions write" on public.laboral_extractions for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "laboral_compliance read" on public.laboral_compliance_status for select using (public.is_workspace_member(workspace_id));
create policy "laboral_compliance write" on public.laboral_compliance_status for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "laboral_alerts read" on public.laboral_alerts for select using (public.is_workspace_member(workspace_id));
create policy "laboral_alerts write" on public.laboral_alerts for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));
