export type ModuleKey = "cfdi" | "laboral" | "contratos";
export type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";
export type ComplianceLevel = "compliant" | "expiring" | "expired" | "invalid" | "missing";
export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface WorkspaceScoped {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at?: string | null;
}

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "good" | "warning" | "danger";
}
