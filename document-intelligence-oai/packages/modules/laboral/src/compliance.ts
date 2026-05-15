import type { ComplianceLevel } from "@marvicqui/shared-db";
import type { LaboralDocumentStatus } from "./index";

export function calculateComplianceLevel({
  expiresAt,
  isValid,
  now = new Date()
}: Readonly<{
  expiresAt?: string | null;
  isValid: boolean;
  now?: Date;
}>): ComplianceLevel {
  if (!isValid) {
    return "invalid";
  }

  if (!expiresAt) {
    return "missing";
  }

  const expiration = new Date(`${expiresAt}T00:00:00`);
  const current = new Date(now.toISOString().slice(0, 10));
  const days = Math.ceil((expiration.getTime() - current.getTime()) / 86_400_000);

  if (days < 0) {
    return "expired";
  }

  if (days <= 7) {
    return "expiring";
  }

  return "compliant";
}

export function aggregateContractorStatus(statuses: LaboralDocumentStatus[]): ComplianceLevel {
  const priority: ComplianceLevel[] = ["invalid", "expired", "missing", "expiring", "compliant"];
  const levels = new Set(statuses.map((status) => status.level));

  return priority.find((level) => levels.has(level)) ?? "missing";
}
