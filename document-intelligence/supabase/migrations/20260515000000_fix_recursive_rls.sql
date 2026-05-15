-- 20260515000000_fix_recursive_rls.sql
-- Fix: the original "members self read" policy queried workspace_members from
-- inside the same workspace_members policy → infinite recursion / empty results.
-- Replace with a clean non-recursive policy.

drop policy if exists "members self read" on public.workspace_members;
drop policy if exists "members owner/admin write" on public.workspace_members;

-- Read: user sees their own rows. Platform admin sees everything.
create policy "members self read" on public.workspace_members
  for select using (
    user_id = auth.uid()
    or coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
  );

-- Read members of same workspace: implemented via a separate predicate that
-- looks at profiles, not workspace_members (avoids recursion).
create policy "members peers read" on public.workspace_members
  for select using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- Write: owners and admins of the workspace can manage memberships.
create policy "members owner/admin write" on public.workspace_members
  for all using (
    exists (
      select 1 from public.workspace_members me
      where me.workspace_id = workspace_members.workspace_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
    or coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
  ) with check (
    exists (
      select 1 from public.workspace_members me
      where me.workspace_id = workspace_members.workspace_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
    or coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false)
  );

-- Backfill: ensure platform admin email gets is_platform_admin=true even if
-- the database setting was missing when the trigger ran.
update public.profiles p
set is_platform_admin = true
from auth.users u
where p.id = u.id
  and u.email = 'marvicqui@gmail.com';
