-- 20260515010000_security_definer_admin.sql
-- Fix: ALL policies that check "is_platform_admin" via a subquery on public.profiles
-- caused infinite recursion (the subquery itself goes through profiles policies).
-- Solution: a SECURITY DEFINER function bypasses RLS for the admin check.

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(p.is_platform_admin, false)
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated, service_role;

-- =============================================================================
-- Re-create all policies using the SECURITY DEFINER function.
-- =============================================================================

-- PROFILES
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;

create policy "profiles read" on public.profiles
  for select using (id = auth.uid() or public.is_platform_admin());

create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- WORKSPACES
drop policy if exists "workspaces member read" on public.workspaces;
drop policy if exists "workspaces owner update" on public.workspaces;

create policy "workspaces read" on public.workspaces
  for select using (
    public.is_platform_admin()
    or id in (select wm.workspace_id from public.workspace_members wm where wm.user_id = auth.uid())
  );

create policy "workspaces owner update" on public.workspaces
  for update using (
    id in (select wm.workspace_id from public.workspace_members wm where wm.user_id = auth.uid() and wm.role = 'owner')
  );

-- WORKSPACE_MEMBERS — drop ALL existing and re-create non-recursive.
drop policy if exists "members self read" on public.workspace_members;
drop policy if exists "members peers read" on public.workspace_members;
drop policy if exists "members owner/admin write" on public.workspace_members;

-- Self read (no recursion: just compares user_id to auth.uid()).
create policy "members self read" on public.workspace_members
  for select using (user_id = auth.uid() or public.is_platform_admin());

-- Write (owners/admins of the SAME workspace can manage memberships).
-- Uses an EXISTS subquery on a DIFFERENT alias to avoid recursion confusion.
create policy "members admin write" on public.workspace_members
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.workspace_members me
      where me.workspace_id = workspace_members.workspace_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  ) with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.workspace_members me
      where me.workspace_id = workspace_members.workspace_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  );

-- =============================================================================
-- Update the helper functions used by module tables to also use is_platform_admin().
-- =============================================================================

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_write_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
      and role in ('owner', 'admin', 'analyst')
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.can_write_workspace(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function public.can_write_workspace(uuid) to authenticated, service_role;
