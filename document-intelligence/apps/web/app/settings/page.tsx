import { requireAppSession } from '@/lib/session';
import { Shell } from '@/components/shell';

export default async function SettingsPage() {
  const session = await requireAppSession();
  return (
    <Shell active="/settings" email={session.email} isPlatformAdmin={session.isPlatformAdmin} workspaceName={session.workspaceName}>
      <h1 className="text-3xl font-semibold tracking-tight">Ajustes</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Perfil</h2>
          <p className="mt-3 text-sm">{session.displayName ?? '—'}</p>
          <p className="text-xs text-zinc-500">{session.email}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Workspace</h2>
          <p className="mt-3 text-sm">{session.workspaceName}</p>
          <p className="text-xs text-zinc-500">Rol: {session.workspaceRole}</p>
        </div>
      </div>
    </Shell>
  );
}
