import type { WorkspaceRole } from '@jvp/shared-db';

export interface SessionContext {
  userId: string;
  email: string;
  displayName: string | null;
  isPlatformAdmin: boolean;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
}

export const ROLES_WRITE: ReadonlyArray<WorkspaceRole> = ['owner', 'admin', 'analyst'];

export const canWrite = (role: WorkspaceRole | null): boolean =>
  role !== null && ROLES_WRITE.includes(role);

export const canAdmin = (role: WorkspaceRole | null): boolean =>
  role === 'owner' || role === 'admin';
