// Database types. Run `pnpm supabase gen types typescript` after first migration
// to replace this with generated types.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ComplianceLevel = 'compliant' | 'expiring' | 'expired' | 'invalid' | 'missing';
export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'viewer';
export type DocumentModule = 'cfdi' | 'laboral' | 'contratos';
export type MatchType = 'exact' | 'fuzzy' | 'llm_inferred' | 'manual';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_platform_admin: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  module: DocumentModule;
  document_subtype: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface SystemEvent {
  id: string;
  workspace_id: string;
  topic: string;
  source_module: DocumentModule | null;
  payload: Json;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Json;
  created_at: string;
}
