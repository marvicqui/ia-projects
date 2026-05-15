-- 20260514000100_core_workspaces.sql
-- Workspaces, profiles, membership. Multi-tenancy foundation.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  primary_color text not null default '#0F172A',
  created_at timestamptz not null default now()
);

create type public.workspace_role as enum ('owner', 'admin', 'analyst', 'viewer');

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- profiles: each user can read & update their own. Platform admins read everyone.
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid() or (select is_platform_admin from public.profiles where id = auth.uid()));
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces: members can read; only owners can update; platform admins read all.
create policy "workspaces member read" on public.workspaces
  for select using (
    id in (select workspace_id from public.workspace_members where user_id = auth.uid())
    or (select is_platform_admin from public.profiles where id = auth.uid())
  );
create policy "workspaces owner update" on public.workspaces
  for update using (
    id in (select workspace_id from public.workspace_members where user_id = auth.uid() and role = 'owner')
  );

-- workspace_members: users see rows of workspaces they belong to.
create policy "members self read" on public.workspace_members
  for select using (
    user_id = auth.uid()
    or workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
    or (select is_platform_admin from public.profiles where id = auth.uid())
  );
create policy "members owner/admin write" on public.workspace_members
  for all using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
    or (select is_platform_admin from public.profiles where id = auth.uid())
  );
