-- 20260515020000_workspace_members_no_recursion.sql
-- Final fix: split workspace_members policies by command (no FOR ALL),
-- and use a SECURITY DEFINER function for the "is admin of workspace" check
-- to avoid recursion when SELECTing.

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_admin(uuid) to authenticated, service_role;

drop policy if exists "members self read" on public.workspace_members;
drop policy if exists "members admin write" on public.workspace_members;
drop policy if exists "members owner/admin write" on public.workspace_members;
drop policy if exists "members peers read" on public.workspace_members;

create policy "members self read" on public.workspace_members
  for select using (user_id = auth.uid() or public.is_platform_admin());

create policy "members admin insert" on public.workspace_members
  for insert with check (public.is_workspace_admin(workspace_id));

create policy "members admin update" on public.workspace_members
  for update using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "members admin delete" on public.workspace_members
  for delete using (public.is_workspace_admin(workspace_id));
