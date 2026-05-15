create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  parties jsonb not null default '[]'::jsonb,
  contract_type text not null,
  effective_date date,
  expires_at date,
  jurisdiction text,
  amount numeric(14, 2),
  currency text not null default 'MXN',
  overall_severity text not null default 'low' check (overall_severity in ('low', 'medium', 'high', 'critical')),
  executive_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contract_clauses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  clause_index integer not null,
  clause_type text not null,
  title text,
  text text not null,
  page_start integer,
  page_end integer,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  created_at timestamptz not null default now(),
  unique (contract_id, clause_index)
);

create table public.contract_risks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  clause_id uuid references public.contract_clauses(id) on delete cascade,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  finding text not null,
  recommendation text not null,
  rationale text,
  created_at timestamptz not null default now()
);

create table public.contract_embeddings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete cascade,
  clause_id uuid references public.contract_clauses(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  clause_type text not null,
  title text not null,
  reference_text text not null,
  preferred_position text,
  severity_if_missing text not null default 'medium' check (severity_if_missing in ('low', 'medium', 'high', 'critical')),
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_workspace_created_idx on public.contracts (workspace_id, created_at desc);
create index contract_clauses_contract_idx on public.contract_clauses (contract_id, clause_index);
create index contract_risks_contract_idx on public.contract_risks (contract_id, severity);
create index contract_embeddings_vector_idx on public.contract_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index contract_templates_vector_idx on public.contract_templates using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create trigger contracts_set_updated_at
before update on public.contracts
for each row execute function public.set_updated_at();

create trigger contract_templates_set_updated_at
before update on public.contract_templates
for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;
alter table public.contract_clauses enable row level security;
alter table public.contract_risks enable row level security;
alter table public.contract_embeddings enable row level security;
alter table public.contract_templates enable row level security;

create policy "contracts members read" on public.contracts for select using (public.is_workspace_member(workspace_id));
create policy "contracts members write" on public.contracts for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "contract_clauses members read" on public.contract_clauses for select using (public.is_workspace_member(workspace_id));
create policy "contract_clauses members write" on public.contract_clauses for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "contract_risks members read" on public.contract_risks for select using (public.is_workspace_member(workspace_id));
create policy "contract_risks members write" on public.contract_risks for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "contract_embeddings members read" on public.contract_embeddings for select using (public.is_workspace_member(workspace_id));
create policy "contract_embeddings members write" on public.contract_embeddings for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "contract_templates members read" on public.contract_templates for select using (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "contract_templates members write" on public.contract_templates for all using (workspace_id is not null and public.is_workspace_writer(workspace_id)) with check (workspace_id is not null and public.is_workspace_writer(workspace_id));

create or replace function public.match_contract_clauses(
  query_embedding vector(1536),
  match_workspace_id uuid,
  match_count integer default 5
)
returns table (
  clause_id uuid,
  contract_id uuid,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ce.clause_id,
    ce.contract_id,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.contract_embeddings ce
  where ce.workspace_id = match_workspace_id
    and public.is_workspace_member(match_workspace_id)
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;
