import { requirePlatformAdmin, buildCookieAdapter } from '@/lib/session';
import { Shell } from '@/components/shell';
import { createSupabaseServerClient } from '@jvp/shared-db';

export default async function AdminPage() {
  const session = await requirePlatformAdmin();
  const { adapter } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at');

  const [{ count: usersCount }, { count: docsCount }, { count: cfdiCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('cfdi_xmls').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <Shell active="/admin" email={session.email} isPlatformAdmin workspaceName={session.workspaceName}>
      <header className="rounded-md border-l-4 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-950">
        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
          Modo admin plataforma — visibilidad sobre todos los workspaces.
        </p>
      </header>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Admin global</h1>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Usuarios</p>
          <p className="mt-2 text-3xl font-semibold">{usersCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Documentos</p>
          <p className="mt-2 text-3xl font-semibold">{docsCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">CFDIs</p>
          <p className="mt-2 text-3xl font-semibold">{cfdiCount ?? 0}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Workspaces</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Nombre</th>
                <th className="px-4 py-2 text-left font-medium">Slug</th>
                <th className="px-4 py-2 text-left font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {(workspaces ?? []).map((w) => (
                <tr key={w.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-2">{w.name}</td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{w.slug}</td>
                  <td className="px-4 py-2 text-xs text-zinc-500">
                    {new Date(w.created_at).toLocaleString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
