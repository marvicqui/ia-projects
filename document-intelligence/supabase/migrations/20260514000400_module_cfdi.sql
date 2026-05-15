-- 20260514000400_module_cfdi.sql
-- Module 1: CFDI <-> bank statement reconciliation.

create type public.cfdi_comprobante_type as enum ('I', 'E', 'T', 'P', 'N');  -- Ingreso, Egreso, Traslado, Pago, Nómina
create type public.bank_code as enum ('BBVA', 'SANTANDER', 'BANAMEX', 'OTRO');
create type public.match_type as enum ('exact', 'fuzzy', 'llm_inferred', 'manual');
create type public.reconciliation_status as enum ('running', 'completed', 'failed');
create type public.match_review_status as enum ('auto', 'pending', 'confirmed', 'rejected');

create table if not exists public.cfdi_xmls (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  uuid_sat text not null,
  emisor_rfc text not null,
  emisor_nombre text,
  receptor_rfc text not null,
  receptor_nombre text,
  total numeric(15, 2) not null,
  subtotal numeric(15, 2),
  fecha timestamptz not null,
  serie text,
  folio text,
  comprobante_type public.cfdi_comprobante_type not null,
  forma_pago text,
  metodo_pago text,
  moneda text default 'MXN',
  raw_xml text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_cfdi_workspace_uuid on public.cfdi_xmls(workspace_id, uuid_sat);
create index if not exists idx_cfdi_workspace_fecha on public.cfdi_xmls(workspace_id, fecha);
create index if not exists idx_cfdi_workspace_total on public.cfdi_xmls(workspace_id, total);
create index if not exists idx_cfdi_concept_trgm on public.cfdi_xmls using gin (emisor_nombre gin_trgm_ops, receptor_nombre gin_trgm_ops);

create table if not exists public.bank_statements (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  bank public.bank_code not null,
  account_number_masked text,
  period_start date,
  period_end date,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bank_statements_workspace on public.bank_statements(workspace_id, period_end desc);

create table if not exists public.bank_transactions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  fecha date not null,
  concepto text not null,
  monto numeric(15, 2) not null,
  referencia text,
  is_credit boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bank_tx_workspace_fecha on public.bank_transactions(workspace_id, fecha);
create index if not exists idx_bank_tx_statement on public.bank_transactions(statement_id);
create index if not exists idx_bank_tx_monto on public.bank_transactions(workspace_id, monto);
create index if not exists idx_bank_tx_concepto_trgm on public.bank_transactions using gin (concepto gin_trgm_ops);

create table if not exists public.reconciliations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  status public.reconciliation_status not null default 'running',
  stats jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_reconciliations_workspace on public.reconciliations(workspace_id, started_at desc);

create table if not exists public.reconciliation_matches (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reconciliation_id uuid not null references public.reconciliations(id) on delete cascade,
  cfdi_id uuid references public.cfdi_xmls(id) on delete cascade,
  transaction_id uuid references public.bank_transactions(id) on delete cascade,
  match_type public.match_type not null,
  confidence numeric(4, 3) not null default 1.000,
  review_status public.match_review_status not null default 'auto',
  rationale text,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create index if not exists idx_recon_matches_workspace on public.reconciliation_matches(workspace_id, reconciliation_id);
create index if not exists idx_recon_matches_cfdi on public.reconciliation_matches(cfdi_id);
create index if not exists idx_recon_matches_tx on public.reconciliation_matches(transaction_id);

alter table public.cfdi_xmls enable row level security;
alter table public.bank_statements enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.reconciliations enable row level security;
alter table public.reconciliation_matches enable row level security;

create policy "cfdi read" on public.cfdi_xmls for select using (public.is_workspace_member(workspace_id));
create policy "cfdi write" on public.cfdi_xmls for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "bank_statements read" on public.bank_statements for select using (public.is_workspace_member(workspace_id));
create policy "bank_statements write" on public.bank_statements for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "bank_transactions read" on public.bank_transactions for select using (public.is_workspace_member(workspace_id));
create policy "bank_transactions write" on public.bank_transactions for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "reconciliations read" on public.reconciliations for select using (public.is_workspace_member(workspace_id));
create policy "reconciliations write" on public.reconciliations for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));

create policy "recon_matches read" on public.reconciliation_matches for select using (public.is_workspace_member(workspace_id));
create policy "recon_matches write" on public.reconciliation_matches for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));
