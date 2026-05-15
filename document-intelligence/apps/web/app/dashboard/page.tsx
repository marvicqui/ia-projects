import { requireAppSession, buildCookieAdapter } from '@/lib/session';
import { Shell } from '@/components/shell';
import { createSupabaseServerClient } from '@jvp/shared-db';
import Link from 'next/link';

const Card = ({ title, value, href }: { title: string; value: string | number; href: string }) => (
  <Link
    href={href}
    className="block rounded-lg border border-zinc-200 bg-white p-6 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
  >
    <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
    <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
  </Link>
);

export default async function DashboardPage() {
  const session = await requireAppSession();
  const { adapter } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const [{ count: cfdiCount }, { count: txCount }, { count: reconCount }] = await Promise.all([
    supabase.from('cfdi_xmls').select('*', { count: 'exact', head: true }).eq('workspace_id', session.workspaceId),
    supabase.from('bank_transactions').select('*', { count: 'exact', head: true }).eq('workspace_id', session.workspaceId),
    supabase.from('reconciliations').select('*', { count: 'exact', head: true }).eq('workspace_id', session.workspaceId),
  ]);

  return (
    <Shell active="/dashboard" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Bienvenido, {session.displayName ?? session.email}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Workspace activo: <strong>{session.workspaceName}</strong> · Rol: {session.workspaceRole}
        </p>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card title="CFDIs cargados" value={cfdiCount ?? 0} href="/cfdi" />
        <Card title="Transacciones bancarias" value={txCount ?? 0} href="/cfdi" />
        <Card title="Conciliaciones" value={reconCount ?? 0} href="/cfdi" />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/laboral"
          className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          <strong className="block text-zinc-900 dark:text-zinc-100">Cumplimiento Laboral</strong>
          Schema listo. Implementación de extractores REPSE/IMSS/INFONAVIT pendiente en próxima sesión.
        </Link>
        <Link
          href="/contratos"
          className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          <strong className="block text-zinc-900 dark:text-zinc-100">Análisis de Contratos</strong>
          Schema + pgvector listo. Pipeline Mastra pendiente en próxima sesión.
        </Link>
      </section>
    </Shell>
  );
}
