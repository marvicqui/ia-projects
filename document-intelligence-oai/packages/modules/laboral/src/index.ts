import type { ComplianceLevel } from "@marvicqui/shared-db";

export type LaboralDocumentType = "repse" | "sat_32d" | "imss_32d" | "infonavit" | "csf";

export interface LaboralDocumentStatus {
  type: LaboralDocumentType;
  level: ComplianceLevel;
  expiresAt?: string;
}

export interface LaboralContractor {
  id: string;
  rfc: string;
  legalName: string;
  contactEmail: string;
  contactPhone?: string;
  status: ComplianceLevel;
}
