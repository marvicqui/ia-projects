create table public.cfdi_xmls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  sat_uuid text not null,
  issuer_rfc text not null,
  issuer_name text,
  receiver_rfc text not null,
  receiver_name text,
  total numeric(14, 2) not null,
  currency text not null default 'MXN',
  issued_at timestamptz not null,
  comprobante_type text not null check (comprobante_type in ('I', 'E', 'P', 'N', 'T')),
  raw_xml jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, sat_uuid)
);

create table public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  bank text not null check (bank in ('bbva', 'santander', 'banamex', 'other')),
  account_number text,
  period_start date not null,
  period_end date not null,
  currency text not null default 'MXN',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bank_statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_date date not null,
  concept text not null,
  amount numeric(14, 2) not null,
  reference text,
  counterparty_rfc text,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bank_statement_id uuid not null references public.bank_statements(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  total_transactions integer not null default 0,
  matched_transactions integer not null default 0,
  unmatched_transactions integer not null default 0,
  suspicious_transactions integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reconciliation_id uuid not null references public.reconciliations(id) on delete cascade,
  cfdi_xml_id uuid not null references public.cfdi_xmls(id) on delete cascade,
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  match_type text not null check (match_type in ('exact', 'fuzzy', 'llm_inferred', 'manual')),
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  reasoning text,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (reconciliation_id, cfdi_xml_id, bank_transaction_id)
);

create index cfdi_xmls_workspace_issued_idx on public.cfdi_xmls (workspace_id, issued_at desc);
create index bank_transactions_statement_date_idx on public.bank_transactions (bank_statement_id, transaction_date);
create index reconciliation_matches_reconciliation_idx on public.reconciliation_matches (reconciliation_id);

create trigger cfdi_xmls_set_updated_at
before update on public.cfdi_xmls
for each row execute function public.set_updated_at();

create trigger bank_statements_set_updated_at
before update on public.bank_statements
for each row execute function public.set_updated_at();

create trigger reconciliations_set_updated_at
before update on public.reconciliations
for each row execute function public.set_updated_at();

alter table public.cfdi_xmls enable row level security;
alter table public.bank_statements enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.reconciliations enable row level security;
alter table public.reconciliation_matches enable row level security;

create policy "cfdi_xmls members read" on public.cfdi_xmls for select using (public.is_workspace_member(workspace_id));
create policy "cfdi_xmls members write" on public.cfdi_xmls for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "bank_statements members read" on public.bank_statements for select using (public.is_workspace_member(workspace_id));
create policy "bank_statements members write" on public.bank_statements for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "bank_transactions members read" on public.bank_transactions for select using (public.is_workspace_member(workspace_id));
create policy "bank_transactions members write" on public.bank_transactions for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "reconciliations members read" on public.reconciliations for select using (public.is_workspace_member(workspace_id));
create policy "reconciliations members write" on public.reconciliations for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
create policy "reconciliation_matches members read" on public.reconciliation_matches for select using (public.is_workspace_member(workspace_id));
create policy "reconciliation_matches members write" on public.reconciliation_matches for all using (public.is_workspace_writer(workspace_id)) with check (public.is_workspace_writer(workspace_id));
