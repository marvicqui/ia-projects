import type { WorkspaceRole } from "@marvicqui/shared-db";

export const writerRoles = ["owner", "admin", "analyst"] as const satisfies readonly WorkspaceRole[];

export function canWrite(role: WorkspaceRole): boolean {
  return writerRoles.includes(role as (typeof writerRoles)[number]);
}

export function canAdmin(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}
