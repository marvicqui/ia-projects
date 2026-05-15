-- 20260515030000_robust_handle_new_user.sql
-- Hardening: handle_new_user falló con cuentas Microsoft donde email puede ser
-- NULL o el metadata trae los nombres en campos distintos (preferred_username).
-- Esta versión maneja todos los nulls explícitamente.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_email text := current_setting('app.platform_admin_email', true);
  v_workspace_id uuid;
  v_display_name text;
  v_slug text;
begin
  -- Fallback chain robusto para nombre visible.
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuario'
  );

  insert into public.profiles (id, display_name, avatar_url, is_platform_admin)
  values (
    new.id,
    v_display_name,
    new.raw_user_meta_data->>'avatar_url',
    case
      when v_admin_email is not null and new.email is not null and lower(new.email) = lower(v_admin_email)
      then true
      else false
    end
  );

  -- Slug: limpia caracteres, asegura no-vacío con sufijo de UUID.
  v_slug := coalesce(
    nullif(regexp_replace(lower(v_display_name), '[^a-z0-9]+', '-', 'g'), ''),
    'workspace'
  ) || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (name, slug, primary_color)
  values ('Workspace de ' || v_display_name, v_slug, '#0F172A')
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    -- No re-raise: dejamos que el auth.users INSERT complete aunque falle el bootstrapping.
    -- El user puede crear su workspace despues desde /onboarding.
    return new;
end;
$$;
