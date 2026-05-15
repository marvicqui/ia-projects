import { requirePlatformAdmin } from '@/lib/session';
import { createAdminClient } from '@/lib/admin';
import { Shell } from '@/components/shell';
import { AdminAllowedEmails } from '@/components/admin-allowed-emails';
import { AdminUsers, type AdminUser } from '@/components/admin-users';
import { formatDateTime } from '@/lib/dates';

interface UserAggregate {
  workspace_count: number;
}

export default async function AdminPage() {
  const session = await requirePlatformAdmin();
  const supabase = createAdminClient();

  // Allowed emails
  const { data: allowedRaw } = await supabase
    .from('allowed_emails')
    .select('id, email, notes, created_at')
    .order('created_at', { ascending: false });
  const allowed = (allowedRaw ?? []).map((r) => ({
    id: r.id as string,
    email: r.email as string,
    notes: (r.notes as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  // Users (auth.users via admin API + join with profiles + workspace count)
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authErr ? [] : authData.users;

  const userIds = authUsers.map((u) => u.id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, is_platform_admin')
    .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

  const wsCounts = new Map<string, number>();
  for (const m of members ?? []) {
    const uid = m.user_id as string;
    wsCounts.set(uid, (wsCounts.get(uid) ?? 0) + 1);
  }

  const profileById = new Map<string, { display_name: string | null; is_platform_admin: boolean }>();
  for (const p of profiles ?? []) {
    profileById.set(p.id as string, {
      display_name: (p.display_name as string | null) ?? null,
      is_platform_admin: Boolean(p.is_platform_admin),
    });
  }

  const adminUsers: AdminUser[] = authUsers
    .map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? '(sin email)',
        display_name: profile?.display_name ?? null,
        is_platform_admin: profile?.is_platform_admin ?? false,
        created_at: u.created_at,
        workspace_count: wsCounts.get(u.id) ?? 0,
        is_self: u.id === session.userId,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false });

  // Stats
  const totalUsers = authUsers.length;
  const totalDocs = (await supabase.from('documents').select('*', { count: 'exact', head: true })).count ?? 0;
  const totalCfdi = (await supabase.from('cfdi_xmls').select('*', { count: 'exact', head: true })).count ?? 0;

  return (
    <Shell active="/admin" email={session.email} isPlatformAdmin workspaceName={session.workspaceName}>
      <header className="rounded-md border-l-4 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-950">
        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
          Modo admin plataforma — visibilidad y control sobre todos los workspaces y usuarios.
        </p>
      </header>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Admin global</h1>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Usuarios</p>
          <p className="mt-2 text-3xl font-semibold">{totalUsers}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Documentos</p>
          <p className="mt-2 text-3xl font-semibold">{totalDocs}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">CFDIs</p>
          <p className="mt-2 text-3xl font-semibold">{totalCfdi}</p>
        </div>
      </section>

      <AdminAllowedEmails initial={allowed} />

      <AdminUsers initial={adminUsers} />

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
                <tr key={w.id as string} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-2">{w.name as string}</td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{w.slug as string}</td>
                  <td className="px-4 py-2 text-xs text-zinc-500">
                    {formatDateTime(w.created_at as string)}
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
