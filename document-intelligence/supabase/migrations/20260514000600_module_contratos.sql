-- 20260514000600_module_contratos.sql
-- Module 3: Contract analysis with multi-agent pipeline + pgvector RAG.

create type public.clause_type as enum (
  'indemnizacion', 'no_compete', 'terminacion', 'confidencialidad',
  'propiedad_intelectual', 'fuerza_mayor', 'jurisdiccion', 'pago',
  'subcontratacion', 'repse', 'otros'
);
create type public.risk_severity as enum ('low', 'medium', 'high', 'critical');

create table if not exists public.contracts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  title text not null,
  contract_type text,
  parties jsonb not null default '[]'::jsonb,
  signed_at date,
  effective_from date,
  effective_to date,
  monto numeric(15, 2),
  moneda text default 'MXN',
  jurisdiccion text,
  full_text text,
  executive_summary text,
  overall_risk public.risk_severity,
  status text not null default 'analyzed',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_contracts_workspace on public.contracts(workspace_id, created_at desc);
create index if not exists idx_contracts_type on public.contracts(workspace_id, contract_type);

create table if not exists public.contract_clauses (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  clause_type public.clause_type not null,
  ordinal integer not null,
  text text not null,
  page_number integer,
  start_char integer,
  end_char integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_clauses_contract on public.contract_clauses(contract_id, ordinal);

create table if not exists public.contract_risks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  clause_id uuid references public.contract_clauses(id) on delete cascade,
  severity public.risk_severity not null,
  title text not null,
  description text not null,
  recommendation text,
  created_at timestamptz not null default now()
);

create index if not exists idx_risks_contract on public.contract_risks(contract_id, severity);

create table if not exists public.contract_embeddings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  clause_id uuid references public.contract_clauses(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_embeddings_vec on public.contract_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_contract_embeddings_contract on public.contract_embeddings(contract_id);

create table if not exists public.contract_templates (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,  -- NULL means platform-wide library
  clause_type public.clause_type not null,
  title text not null,
  reference_text text not null,
  is_recommended boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_templates_type on public.contract_templates(clause_type);

alter table public.contracts enable row level security;
alter table public.contract_clauses enable row level security;
alter table public.contract_risks enable row level security;
alter table public.contract_embeddings enable row level security;
alter table public.contract_templates enable row level security;

create policy "contracts read" on public.contracts for select using (public.is_workspace_member(workspace_id));
create policy "contracts write" on public.contracts for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "clauses read" on public.contract_clauses for select using (public.is_workspace_member(workspace_id));
create policy "clauses write" on public.contract_clauses for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "risks read" on public.contract_risks for select using (public.is_workspace_member(workspace_id));
create policy "risks write" on public.contract_risks for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "embeddings read" on public.contract_embeddings for select using (public.is_workspace_member(workspace_id));
create policy "embeddings write" on public.contract_embeddings for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

-- contract_templates: platform-wide library readable by everyone; workspace-specific by members.
create policy "templates read" on public.contract_templates for select using (
  workspace_id is null or public.is_workspace_member(workspace_id)
);
create policy "templates write" on public.contract_templates for all
  using (workspace_id is not null and public.can_write_workspace(workspace_id))
  with check (workspace_id is not null and public.can_write_workspace(workspace_id));
