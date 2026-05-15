import { requireAppSession, buildCookieAdapter } from '@/lib/session';
import { Shell } from '@/components/shell';
import { createSupabaseServerClient } from '@jvp/shared-db';
import Link from 'next/link';

type Level = 'compliant' | 'expiring' | 'expired' | 'invalid' | 'missing';
const DOC_TYPES: Array<{ key: string; label: string }> = [
  { key: 'repse', label: 'REPSE' },
  { key: 'sat_32d', label: 'SAT 32-D' },
  { key: 'imss_32d', label: 'IMSS 32-D' },
  { key: 'infonavit', label: 'INFONAVIT' },
  { key: 'csf', label: 'CSF' },
];

const LEVEL_STYLE: Record<Level, string> = {
  compliant: 'bg-emerald-500',
  expiring: 'bg-amber-500',
  expired: 'bg-red-600',
  invalid: 'bg-rose-700',
  missing: 'bg-zinc-400',
};
const LEVEL_LABEL: Record<Level, string> = {
  compliant: 'Vigente',
  expiring: 'Por vencer',
  expired: 'Vencido',
  invalid: 'Inválido',
  missing: 'Faltante',
};

export default async function LaboralPage() {
  const session = await requireAppSession();
  const { adapter } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: contractors } = await supabase
    .from('laboral_contractors')
    .select('id, rfc, razon_social, is_active, created_at')
    .eq('workspace_id', session.workspaceId)
    .order('razon_social', { ascending: true });

  const contractorIds = (contractors ?? []).map((c) => c.id);
  const { data: statuses } = await supabase
    .from('laboral_compliance_status')
    .select('contractor_id, doc_type, level, days_until_expiry')
    .in('contractor_id', contractorIds.length ? contractorIds : ['00000000-0000-0000-0000-000000000000']);

  type StatusEntry = { level: Level; days_until_expiry: number | null };
  const byContractor = new Map<string, Map<string, StatusEntry>>();
  for (const s of statuses ?? []) {
    const m = byContractor.get(s.contractor_id) ?? new Map();
    m.set(s.doc_type, { level: s.level, days_until_expiry: s.days_until_expiry });
    byContractor.set(s.contractor_id, m);
  }

  return (
    <Shell active="/laboral" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cumplimiento Laboral</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            REPSE, SAT 32-D, IMSS 32-D, INFONAVIT y CSF de tus contratistas.
          </p>
        </div>
        <Link
          href="/laboral/new"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Nuevo contratista
        </Link>
      </header>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Contratista</th>
              <th className="px-4 py-2 text-left font-medium">RFC</th>
              {DOC_TYPES.map((d) => (
                <th key={d.key} className="px-2 py-2 text-center font-medium">{d.label}</th>
              ))}
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(contractors ?? []).map((c) => {
              const m = byContractor.get(c.id);
              return (
                <tr
                  key={c.id}
                  className="border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <td className="px-4 py-2">
                    <Link href={`/laboral/${c.id}`} className="hover:underline">
                      {c.razon_social}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{c.rfc}</td>
                  {DOC_TYPES.map((d) => {
                    const s = m?.get(d.key);
                    const level: Level = s?.level ?? 'missing';
                    return (
                      <td key={d.key} className="px-2 py-2 text-center">
                        <span
                          title={`${LEVEL_LABEL[level]}${s?.days_until_expiry !== null && s?.days_until_expiry !== undefined ? ` · ${s.days_until_expiry}d` : ''}`}
                          className={`inline-block h-5 w-5 rounded-full ${LEVEL_STYLE[level]}`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right">
                    <Link href={`/laboral/${c.id}`} className="text-xs text-zinc-500 hover:underline">
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!contractors?.length && (
              <tr>
                <td colSpan={DOC_TYPES.length + 3} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Aún no hay contratistas. Empieza con &ldquo;Nuevo contratista&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {(Object.keys(LEVEL_STYLE) as Level[]).map((l) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-full ${LEVEL_STYLE[l]}`} />
            <span className="text-zinc-600 dark:text-zinc-400">{LEVEL_LABEL[l]}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
