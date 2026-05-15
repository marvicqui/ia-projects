import type { ComplianceLevel, ComputeComplianceInput } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const computeComplianceLevel = (input: ComputeComplianceInput): ComplianceLevel => {
  if (!input.valid) return 'invalid';
  if (!input.expiresAt) return 'compliant'; // documento sin fecha de vencimiento (e.g., CSF)

  const now = (input.asOf ?? new Date()).getTime();
  const exp = new Date(input.expiresAt).getTime();
  if (Number.isNaN(exp)) return 'invalid';

  const daysUntil = Math.floor((exp - now) / DAY_MS);
  const expiringDays = input.expiringDays ?? 7;

  if (daysUntil < 0) return 'expired';
  if (daysUntil <= expiringDays) return 'expiring';
  return 'compliant';
};

export const COMPLIANCE_LABELS: Record<ComplianceLevel, string> = {
  compliant: 'Vigente',
  expiring: 'Por vencer',
  expired: 'Vencido',
  invalid: 'Inválido',
  missing: 'Faltante',
};
