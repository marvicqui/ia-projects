import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const COMPLIANCE_COLORS = {
  compliant: 'bg-emerald-500 text-white',
  expiring: 'bg-amber-500 text-white',
  expired: 'bg-red-500 text-white',
  invalid: 'bg-rose-700 text-white',
  missing: 'bg-zinc-400 text-white',
} as const;

export const COMPLIANCE_LABELS = {
  compliant: 'Vigente',
  expiring: 'Por vencer',
  expired: 'Vencido',
  invalid: 'Inválido',
  missing: 'Faltante',
} as const;
