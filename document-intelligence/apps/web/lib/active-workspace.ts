import type { SupabaseClient } from '@supabase/supabase-js';

// Resolves the active workspace_id for an authenticated user.
// Priority: 1) cookie active_workspace_id (if user is member of it)
//           2) first workspace they belong to
// Returns null if the user has no memberships.
export const resolveActiveWorkspace = async (
  supabase: SupabaseClient,
  userId: string,
  cookieWorkspaceId: string | undefined,
): Promise<string | null> => {
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return null;

  if (cookieWorkspaceId) {
    const match = memberships.find((m) => m.workspace_id === cookieWorkspaceId);
    if (match) return match.workspace_id;
  }
  return memberships[0]!.workspace_id;
};
