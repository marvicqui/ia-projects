create or replace function public.enqueue_laboral_expiration_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.laboral_alerts (
    workspace_id,
    contractor_id,
    compliance_status_id,
    alert_type,
    channel,
    recipient,
    message
  )
  select
    lcs.workspace_id,
    lcs.contractor_id,
    lcs.id,
    case
      when lcs.expires_at < current_date then 'expired'
      else 'expiring'
    end,
    'system',
    coalesce(lc.contact_email, 'workspace-owner'),
    'Documento ' || lcs.document_type || ' de ' || lc.legal_name || ' requiere atencion.'
  from public.laboral_compliance_status lcs
  join public.laboral_contractors lc on lc.id = lcs.contractor_id
  where lcs.level in ('expiring', 'expired')
    and lcs.expires_at <= current_date + interval '7 days'
    and not exists (
      select 1
      from public.laboral_alerts la
      where la.compliance_status_id = lcs.id
        and la.alert_type in ('expiring', 'expired')
        and la.created_at::date = current_date
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.enqueue_weekly_summary_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.system_events (workspace_id, module, event_type, payload)
  select
    w.id,
    'system',
    'weekly_summary.requested',
    jsonb_build_object('workspace_name', w.name)
  from public.workspaces w
  where not exists (
    select 1
    from public.system_events se
    where se.workspace_id = w.id
      and se.event_type = 'weekly_summary.requested'
      and se.created_at > now() - interval '6 days'
  );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

do $$
begin
  perform cron.unschedule('daily-compliance-check');
exception
  when others then null;
end $$;

select cron.schedule(
  'daily-compliance-check',
  '0 14 * * *',
  $$select public.enqueue_laboral_expiration_alerts();$$
);

do $$
begin
  perform cron.unschedule('weekly-summary-email');
exception
  when others then null;
end $$;

select cron.schedule(
  'weekly-summary-email',
  '0 23 * * 5',
  $$select public.enqueue_weekly_summary_events();$$
);
