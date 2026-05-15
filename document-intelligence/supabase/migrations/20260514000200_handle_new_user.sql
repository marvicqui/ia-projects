-- 20260514000200_handle_new_user.sql
-- Trigger: on new auth.users insert, create profile + default workspace + owner membership.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := current_setting('app.platform_admin_email', true);
  v_workspace_id uuid;
  v_display_name text;
  v_slug text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name, avatar_url, is_platform_admin)
  values (
    new.id,
    v_display_name,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.email = v_admin_email, false)
  );

  v_slug := regexp_replace(lower(v_display_name), '[^a-z0-9]+', '-', 'g') || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (name, slug, primary_color)
  values ('Workspace de ' || v_display_name, v_slug, '#0F172A')
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
