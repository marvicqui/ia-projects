-- 20260514000300_shared_tables.sql
-- Shared tables used by all modules: documents, system_events, audit_log, api_keys.

create type public.document_module as enum ('cfdi', 'laboral', 'contratos');

create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module public.document_module not null,
  document_subtype text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_workspace_module on public.documents(workspace_id, module);
create index if not exists idx_documents_uploaded_by on public.documents(uploaded_by);

create table if not exists public.system_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic text not null,
  source_module public.document_module,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_events_workspace_topic on public.system_events(workspace_id, topic, created_at desc);

create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_workspace on public.audit_log(workspace_id, created_at desc);

create table if not exists public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null,
  prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_api_keys_hash on public.api_keys(key_hash);

alter table public.documents enable row level security;
alter table public.system_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.api_keys enable row level security;

-- generic RLS helper as a reusable subquery
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  ) or coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_write_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
      and role in ('owner', 'admin', 'analyst')
  ) or coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

create policy "documents read" on public.documents
  for select using (public.is_workspace_member(workspace_id));
create policy "documents write" on public.documents
  for all using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));

create policy "system_events read" on public.system_events
  for select using (public.is_workspace_member(workspace_id));
create policy "system_events insert" on public.system_events
  for insert with check (public.can_write_workspace(workspace_id));

create policy "audit_log read" on public.audit_log
  for select using (
    workspace_id is null and coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
    or public.is_workspace_member(workspace_id)
  );

create policy "api_keys read" on public.api_keys
  for select using (public.is_workspace_member(workspace_id));
create policy "api_keys write" on public.api_keys
  for all using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
