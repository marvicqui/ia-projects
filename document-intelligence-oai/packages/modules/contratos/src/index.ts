import type { RiskSeverity } from "@marvicqui/shared-db";

export interface ContractSummary {
  title: string;
  parties: string[];
  contractType: string;
  jurisdiction: string;
  amount?: number;
  effectiveDate?: string;
  expiresAt?: string;
}

export interface ContractClause {
  id: string;
  type: string;
  text: string;
  severity: RiskSeverity;
}

export interface ContractRisk {
  clauseId: string;
  severity: RiskSeverity;
  finding: string;
  recommendation: string;
}
