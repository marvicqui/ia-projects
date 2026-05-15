create table public.laboral_contractors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rfc text not null,
  legal_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  portal_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'missing' check (status in ('compliant', 'expiring', 'expired', 'invalid', 'missing')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, rfc)
);

create table public.laboral_extractions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contractor_id uuid not null references public.laboral_contractors(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  document_type text not null check (document_type in ('repse', 'sat_32d', 'imss_32d', 'infonavit', 'csf')),
  extracted_fields jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3) not null default 0 check (confidence >= 0 and confidence <= 1),
  model text not null default 'claude-haiku-4-5',
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.laboral_compliance_status (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contractor_id uuid not null references public.laboral_contractors(id) on delete cascade,
  document_type text not null check (document_type in ('repse', 'sat_32d', 'imss_32d', 'infonavit', 'csf')),
  level text not null check (level in ('compliant', 'expiring', 'expired', 'invalid', 'missing')),
  expires_at date,
  last_document_id uuid references public.documents(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contractor_id, document_type)
);

create table public.laboral_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contractor_id uuid not null references public.laboral_contractors(id) on delete cascade,
  compliance_status_id uuid references public.laboral_compliance_status(id) on delete cascade,
  alert_type text not null check (alert_type in ('expiring', 'expired', 'missing', 'invalid', 'weekly_summary')),
  channel text not null check (channel in ('email', 'whatsapp', 'system')),
  recipient text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index laboral_contractors_workspace_status_idx on public.laboral_contractors (workspace_id, status);
create index laboral_compliance_expiry_idx on public.laboral_compliance_status (workspace_id, expires_at) where expires_at is not null;
create index laboral_alerts_workspace_created_idx on public.laboral_alerts (workspace_id, created_at desc);

create trigger laboral_contractors_set_updated_at
before update on public.laboral_contractors
for each row execute function public.set_updated_at();

create trigger laboral_extractions_set_updated_at
before update on public.laboral_extractions
for each row execute function public.set_updated_at();

create trigger laboral_compliance_status_set_updated_at
before update on public.laboral_compliance_status
for each row execute function public.set_updated_at();

alter table public.laboral_contractors enable row level security;
alter table public.laboral_extractions enable row level security;
alter table public.laboral_compliance_status enable row level security;
alter table public.laboral_alerts enable row level security;

create policy "laboral_contractors members read" on public.laboral_contractors for select using (public.is_workspace_member(workspace_id));
create policy "laboral_contractors members write" on public.laboral_contractors for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "laboral_extractions members read" on public.laboral_extractions for select using (public.is_workspace_member(workspace_id));
create policy "laboral_extractions members write" on public.laboral_extractions for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "laboral_compliance_status members read" on public.laboral_compliance_status for select using (public.is_workspace_member(workspace_id));
create policy "laboral_compliance_status members write" on public.laboral_compliance_status for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "laboral_alerts members read" on public.laboral_alerts for select using (public.is_workspace_member(workspace_id));
create policy "laboral_alerts members write" on public.laboral_alerts for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
