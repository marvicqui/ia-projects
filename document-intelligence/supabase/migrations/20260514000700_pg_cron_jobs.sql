-- 20260514000700_pg_cron_jobs.sql
-- Scheduled jobs via pg_cron. Triggers Supabase Edge Functions that call notification senders.
-- User chose n8n Cloud as primary scheduler; pg_cron lives here as a fallback / for jobs that
-- shouldn't leave the database boundary (compliance recompute).

-- Recompute compliance status for laboral_extractions: runs nightly at 02:00 MX (08:00 UTC).
create or replace function public.recompute_laboral_compliance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.laboral_compliance_status (workspace_id, contractor_id, doc_type, level, days_until_expiry, last_extraction_id, updated_at)
  select distinct on (e.contractor_id, e.doc_type)
    e.workspace_id,
    e.contractor_id,
    e.doc_type,
    case
      when not e.valid then 'invalid'::public.compliance_level
      when e.expires_at is null then 'compliant'::public.compliance_level
      when e.expires_at < current_date then 'expired'::public.compliance_level
      when e.expires_at - current_date <= 7 then 'expiring'::public.compliance_level
      else 'compliant'::public.compliance_level
    end,
    case when e.expires_at is not null then e.expires_at - current_date else null end,
    e.id,
    now()
  from public.laboral_extractions e
  order by e.contractor_id, e.doc_type, e.created_at desc
  on conflict (contractor_id, doc_type) do update set
    level = excluded.level,
    days_until_expiry = excluded.days_until_expiry,
    last_extraction_id = excluded.last_extraction_id,
    updated_at = now();
end;
$$;

select cron.schedule(
  'recompute_laboral_compliance_nightly',
  '0 8 * * *',  -- 02:00 America/Mexico_City (UTC-6 standard time)
  $$ select public.recompute_laboral_compliance(); $$
);
