import { requireAppSession, buildCookieAdapter } from '@/lib/session';
import { Shell } from '@/components/shell';
import { createSupabaseServerClient } from '@jvp/shared-db';
import Link from 'next/link';

export default async function CfdiHomePage() {
  const session = await requireAppSession();
  const { adapter } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: recons } = await supabase
    .from('reconciliations')
    .select('id, name, status, stats, started_at, completed_at')
    .eq('workspace_id', session.workspaceId)
    .order('started_at', { ascending: false })
    .limit(20);

  return (
    <Shell active="/cfdi" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Conciliación CFDI ↔ Banco</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sube CFDIs y tu estado de cuenta. Conciliamos en 3 pasadas: exacto, difuso, IA.
          </p>
        </div>
        <Link
          href="/cfdi/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Nueva conciliación
        </Link>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Conciliaciones recientes</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Nombre</th>
                <th className="px-4 py-2 text-left font-medium">Estado</th>
                <th className="px-4 py-2 text-right font-medium">Exact</th>
                <th className="px-4 py-2 text-right font-medium">Fuzzy</th>
                <th className="px-4 py-2 text-right font-medium">LLM</th>
                <th className="px-4 py-2 text-right font-medium">Sin match</th>
                <th className="px-4 py-2 text-left font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(recons ?? []).map((r) => {
                const s = (r.stats ?? {}) as Record<string, number>;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <td className="px-4 py-2">
                      <Link href={`/cfdi/${r.id}`} className="text-zinc-900 hover:underline dark:text-zinc-100">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.matchedExact ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.matchedFuzzy ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.matchedLlm ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.unmatchedTransactions ?? 0}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {new Date(r.started_at).toLocaleString('es-MX')}
                    </td>
                  </tr>
                );
              })}
              {!recons?.length && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-zinc-500" colSpan={7}>
                    Aún no hay conciliaciones. Empieza con &ldquo;Nueva conciliación&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
