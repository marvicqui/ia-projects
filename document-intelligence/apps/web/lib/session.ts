import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, type CookieStore, type WorkspaceRole } from '@jvp/shared-db';

export interface AppSession {
  userId: string;
  email: string;
  displayName: string | null;
  isPlatformAdmin: boolean;
  workspaceId: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole;
}

export const buildCookieAdapter = async (): Promise<{ adapter: CookieStore; getCookie: (n: string) => string | undefined; setCookie: (n: string, v: string) => void }> => {
  const store = await cookies();
  const adapter: CookieStore = {
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (toSet) => {
      for (const c of toSet) {
        try {
          store.set({ name: c.name, value: c.value, ...(c.options ?? {}) });
        } catch {
          // RSC context: cookies are read-only.
        }
      }
    },
  };
  return {
    adapter,
    getCookie: (name: string) => store.get(name)?.value,
    setCookie: (name: string, value: string) => {
      try {
        store.set({ name, value, path: '/' });
      } catch {
        /* RSC */
      }
    },
  };
};

export const requireAppSession = async (): Promise<AppSession> => {
  const { adapter, getCookie, setCookie } = await buildCookieAdapter();
  const supabase = createSupabaseServerClient(adapter);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_platform_admin')
    .eq('id', user.id)
    .single();

  let activeWorkspaceId = getCookie('active_workspace_id');

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name)')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding');
  }

  const active =
    memberships.find((m) => m.workspace_id === activeWorkspaceId) ?? memberships[0]!;

  if (!activeWorkspaceId || activeWorkspaceId !== active.workspace_id) {
    setCookie('active_workspace_id', active.workspace_id);
  }

  const wsRaw = active.workspaces as unknown;
  const ws = Array.isArray(wsRaw) ? wsRaw[0] : wsRaw;
  const wsName = (ws as { name?: string } | null)?.name ?? 'Workspace';

  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: profile?.display_name ?? null,
    isPlatformAdmin: profile?.is_platform_admin ?? false,
    workspaceId: active.workspace_id,
    workspaceName: wsName,
    workspaceRole: active.role as WorkspaceRole,
  };
};

export const requirePlatformAdmin = async (): Promise<AppSession> => {
  const session = await requireAppSession();
  if (!session.isPlatformAdmin) redirect('/dashboard');
  return session;
};
