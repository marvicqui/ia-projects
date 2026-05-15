create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema extensions;
create extension if not exists "pg_cron";

do $$
begin
  perform set_config('app.platform_admin_email', 'marvicqui@gmail.com', false);
exception
  when others then null;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'analyst', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.system_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module text not null check (module in ('cfdi', 'laboral', 'contratos', 'system')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  module text not null check (module in ('cfdi', 'laboral', 'contratos')),
  document_subtype text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  checksum text,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'processed', 'failed', 'archived')),
  uploaded_by uuid references auth.users(id) on delete set null,
  public_token text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);
create index workspace_members_user_idx on public.workspace_members (user_id);
create index api_keys_workspace_idx on public.api_keys (workspace_id);
create index system_events_workspace_created_idx on public.system_events (workspace_id, created_at desc);
create index audit_log_workspace_created_idx on public.audit_log (workspace_id, created_at desc);
create index documents_workspace_module_idx on public.documents (workspace_id, module, created_at desc);
create index documents_public_token_idx on public.documents (public_token) where public_token is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create or replace function public.is_platform_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = target_user_id),
    false
  );
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(target_user_id)
    or exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = target_user_id
    );
$$;

create or replace function public.is_workspace_writer(target_workspace_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(target_user_id)
    or exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = target_user_id
        and wm.role in ('owner', 'admin', 'analyst')
    );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(target_user_id)
    or exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = target_user_id
        and wm.role in ('owner', 'admin')
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_workspace_id uuid := gen_random_uuid();
  user_email text := lower(coalesce(new.email, ''));
  profile_name text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(user_email, '@', 1));
  admin_email text := lower(coalesce(current_setting('app.platform_admin_email', true), 'marvicqui@gmail.com'));
begin
  insert into public.profiles (id, email, display_name, avatar_url, is_platform_admin)
  values (
    new.id,
    user_email,
    profile_name,
    new.raw_user_meta_data->>'avatar_url',
    user_email = admin_email
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      is_platform_admin = public.profiles.is_platform_admin or excluded.is_platform_admin;

  insert into public.workspaces (id, name, owner_id)
  values (new_workspace_id, 'Workspace de ' || coalesce(profile_name, 'usuario'), new.id);

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.system_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.documents enable row level security;

create policy "profiles read own or platform admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());

create policy "profiles update own or platform admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

create policy "workspaces members read"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "workspaces members write"
  on public.workspaces for all
  using (public.is_workspace_writer(id))
  with check (public.is_workspace_writer(id));

create policy "workspace members read"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace members admins write"
  on public.workspace_members for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "api keys members read"
  on public.api_keys for select
  using (public.is_workspace_member(workspace_id));

create policy "api keys admins write"
  on public.api_keys for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "system events members read"
  on public.system_events for select
  using (public.is_workspace_member(workspace_id));

create policy "system events writers insert"
  on public.system_events for insert
  with check (public.is_workspace_writer(workspace_id));

create policy "system events platform update"
  on public.system_events for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "audit members read"
  on public.audit_log for select
  using (public.is_workspace_member(workspace_id));

create policy "audit writers insert"
  on public.audit_log for insert
  with check (public.is_workspace_writer(workspace_id));

create policy "documents members read"
  on public.documents for select
  using (public.is_workspace_member(workspace_id));

create policy "documents members write"
  on public.documents for all
  using (public.is_workspace_writer(workspace_id))
  with check (public.is_workspace_writer(workspace_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,
  array['application/pdf', 'text/xml', 'application/xml', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;
