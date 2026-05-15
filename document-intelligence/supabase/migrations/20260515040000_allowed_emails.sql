-- 20260515040000_allowed_emails.sql
-- Allowlist de emails para controlar quién puede registrarse.
-- Bootstrap: si la tabla está vacía, cualquier email pasa.

create table if not exists public.allowed_emails (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Normalizamos email a lowercase para evitar duplicados case-sensitive.
create or replace function public.normalize_allowed_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists normalize_allowed_email_trigger on public.allowed_emails;
create trigger normalize_allowed_email_trigger
  before insert or update on public.allowed_emails
  for each row execute function public.normalize_allowed_email();

alter table public.allowed_emails enable row level security;

-- Solo platform admins leen/escriben el allowlist.
create policy "allowed_emails admin read" on public.allowed_emails
  for select using (public.is_platform_admin());

create policy "allowed_emails admin write" on public.allowed_emails
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- =============================================================================
-- Trigger handle_new_user actualizado con check de allowlist.
-- =============================================================================

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
  v_allowlist_count integer;
  v_email_lower text := lower(new.email);
begin
  -- Allowlist check (bootstrap mode: si tabla vacía, permite todos).
  select count(*) into v_allowlist_count from public.allowed_emails;

  if v_allowlist_count > 0 then
    if new.email is null or not exists (
      select 1 from public.allowed_emails where email = v_email_lower
    ) then
      raise exception 'EMAIL_NOT_ALLOWED: % no esta autorizado para registrarse', coalesce(new.email, '(no email)')
        using errcode = '42501';
    end if;
  end if;

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
      when v_admin_email is not null and new.email is not null
        and lower(new.email) = lower(v_admin_email)
      then true
      else false
    end
  );

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
end;
$$;
