import { createAdminClient } from '@/lib/admin';
import { sendEmail, sendWhatsApp } from '@jvp/shared-notifications';

type Level = 'compliant' | 'expiring' | 'expired' | 'invalid' | 'missing';

const DOC_LABELS: Record<string, string> = {
  repse: 'REPSE',
  sat_32d: 'SAT 32-D',
  imss_32d: 'IMSS 32-D',
  infonavit: 'INFONAVIT',
  csf: 'CSF',
};

export interface AlertRunResult {
  scanned: number;
  emailsSent: number;
  whatsappSent: number;
  skipped: number;
  errors: Array<{ contractorId: string; docType: string; error: string }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const buildEmailHtml = (params: {
  workspaceName: string;
  contractorName: string;
  docLabel: string;
  level: Level;
  daysUntil: number | null;
  appUrl: string;
  contractorId: string;
}): { subject: string; html: string; text: string } => {
  const { workspaceName, contractorName, docLabel, level, daysUntil, appUrl, contractorId } = params;
  const status =
    level === 'expired'
      ? daysUntil !== null && daysUntil < 0
        ? `vencido hace ${Math.abs(daysUntil)} día(s)`
        : 'vencido'
      : daysUntil !== null
        ? `vence en ${daysUntil} día(s)`
        : 'por vencer';

  const subject = `[${workspaceName}] ${docLabel} de ${contractorName} ${status}`;

  const action = `${appUrl}/laboral/${contractorId}`;

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
      <h2 style="margin: 0 0 12px; color: #0f172a;">Alerta de cumplimiento</h2>
      <p style="margin: 0 0 16px; color: #334155;">
        El documento <strong>${docLabel}</strong> de <strong>${contractorName}</strong> está
        <strong style="color: ${level === 'expired' ? '#dc2626' : '#d97706'};">${status}</strong>.
      </p>
      <p style="margin: 0 0 24px; color: #475569;">
        Workspace: ${workspaceName}
      </p>
      <a href="${action}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Ver contratista
      </a>
      <p style="margin-top: 32px; color: #94a3b8; font-size: 12px;">
        Email automático de JVP Document Intelligence. No respondas a este mensaje.
      </p>
    </div>
  `;

  const text = `${docLabel} de ${contractorName} ${status}. Workspace: ${workspaceName}.\nVer: ${action}`;

  return { subject, html, text };
};

const buildWhatsAppText = (params: {
  contractorName: string;
  docLabel: string;
  level: Level;
  daysUntil: number | null;
  appUrl: string;
  contractorId: string;
}): string => {
  const { contractorName, docLabel, level, daysUntil, appUrl, contractorId } = params;
  const status =
    level === 'expired'
      ? `vencido${daysUntil !== null && daysUntil < 0 ? ` hace ${Math.abs(daysUntil)}d` : ''}`
      : `vence en ${daysUntil ?? '?'}d`;

  return `*Cumplimiento JVP*\n${docLabel} de ${contractorName} ${status}.\n${appUrl}/laboral/${contractorId}`;
};

export const runLaboralAlerts = async (appUrl: string): Promise<AlertRunResult> => {
  const supabase = createAdminClient();

  // 1. Encontrar status pendientes de alerta: expiring o expired.
  const { data: statuses } = await supabase
    .from('laboral_compliance_status')
    .select(`
      doc_type, level, days_until_expiry, contractor_id, workspace_id,
      contractor:laboral_contractors(razon_social, contact_email, contact_phone),
      workspace:workspaces(name)
    `)
    .in('level', ['expiring', 'expired']);

  if (!statuses || statuses.length === 0) {
    return { scanned: 0, emailsSent: 0, whatsappSent: 0, skipped: 0, errors: [] };
  }

  const result: AlertRunResult = {
    scanned: statuses.length,
    emailsSent: 0,
    whatsappSent: 0,
    skipped: 0,
    errors: [],
  };

  // 2. Para cada status, verificar si ya hay alerta enviada en últimas 24h.
  const since = new Date(Date.now() - DAY_MS).toISOString();

  for (const s of statuses) {
    const contractor = (Array.isArray(s.contractor) ? s.contractor[0] : s.contractor) as
      | { razon_social: string; contact_email: string | null; contact_phone: string | null }
      | null;
    const workspace = (Array.isArray(s.workspace) ? s.workspace[0] : s.workspace) as
      | { name: string }
      | null;

    if (!contractor) continue;

    // Idempotency: skip si ya se envió alerta de este (contractor, doc_type) en últimas 24h.
    const { count: alreadySent } = await supabase
      .from('laboral_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', s.contractor_id)
      .eq('doc_type', s.doc_type)
      .gte('sent_at', since);

    if ((alreadySent ?? 0) > 0) {
      result.skipped++;
      continue;
    }

    const docLabel = DOC_LABELS[s.doc_type] ?? s.doc_type;
    const baseParams = {
      contractorName: contractor.razon_social,
      docLabel,
      level: s.level as Level,
      daysUntil: s.days_until_expiry,
      appUrl,
      contractorId: s.contractor_id,
    };

    // Email
    const recipients: string[] = [];
    if (contractor.contact_email) recipients.push(contractor.contact_email);

    // Owner del workspace: encontrar via workspace_members + auth.users
    const { data: owners } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', s.workspace_id)
      .eq('role', 'owner');
    if (owners?.length) {
      const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 200 });
      for (const o of owners) {
        const u = authUsers.users.find((x) => x.id === o.user_id);
        if (u?.email && !recipients.includes(u.email)) recipients.push(u.email);
      }
    }

    if (recipients.length) {
      const { subject, html, text } = buildEmailHtml({
        ...baseParams,
        workspaceName: workspace?.name ?? 'JVP',
      });
      try {
        await sendEmail({ to: recipients, subject, html, text });
        await supabase.from('laboral_alerts').insert({
          workspace_id: s.workspace_id,
          contractor_id: s.contractor_id,
          doc_type: s.doc_type,
          channel: 'email',
          message: subject,
          delivered: true,
        });
        result.emailsSent++;
      } catch (err) {
        result.errors.push({
          contractorId: s.contractor_id,
          docType: s.doc_type,
          error: `email: ${(err as Error).message}`,
        });
      }
    }

    // WhatsApp
    if (contractor.contact_phone) {
      const body = buildWhatsAppText(baseParams);
      try {
        await sendWhatsApp({ to: contractor.contact_phone, body });
        await supabase.from('laboral_alerts').insert({
          workspace_id: s.workspace_id,
          contractor_id: s.contractor_id,
          doc_type: s.doc_type,
          channel: 'whatsapp',
          message: body.slice(0, 500),
          delivered: true,
        });
        result.whatsappSent++;
      } catch (err) {
        result.errors.push({
          contractorId: s.contractor_id,
          docType: s.doc_type,
          error: `whatsapp: ${(err as Error).message}`,
        });
      }
    }
  }

  return result;
};
