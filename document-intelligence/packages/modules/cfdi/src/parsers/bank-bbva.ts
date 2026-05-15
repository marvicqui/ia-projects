import Papa from 'papaparse';
import type { BankCode, ParsedBankStatement, ParsedBankTransaction } from '../types';

// BBVA México "Estado de cuenta" CSV export.
// Real BBVA exports vary by product (cuenta vs tarjeta). We accept the common format
// with columns: Fecha, Descripción, Cargo, Abono, Saldo. Date in DD/MM/YYYY.

interface BbvaRow {
  Fecha?: string;
  Descripción?: string;
  Descripcion?: string;
  Cargo?: string;
  Abono?: string;
  Referencia?: string;
}

const parseDate = (s: string): Date => {
  const parts = s.split(/[/-]/);
  if (parts.length !== 3) throw new Error(`Invalid date: ${s}`);
  const [d, m, y] = parts.map((p) => Number(p));
  if (!d || !m || !y) throw new Error(`Invalid date: ${s}`);
  return new Date(Date.UTC(y < 100 ? 2000 + y : y, m - 1, d));
};

const parseNumber = (s: string | undefined): number => {
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, '').replace(/[()]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export const parseBbvaCsv = (csv: string): ParsedBankStatement => {
  const result = Papa.parse<BbvaRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type === 'Quotes' || e.type === 'Delimiter');
    if (fatal) throw new Error(`CSV parse error: ${fatal.message}`);
  }

  const transactions: ParsedBankTransaction[] = [];
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const row of result.data) {
    const fechaStr = row.Fecha?.trim();
    if (!fechaStr) continue;
    const descripcion = (row.Descripción ?? row.Descripcion ?? '').trim();
    if (!descripcion) continue;

    const cargo = parseNumber(row.Cargo);
    const abono = parseNumber(row.Abono);
    if (cargo === 0 && abono === 0) continue;

    let fecha: Date;
    try {
      fecha = parseDate(fechaStr);
    } catch {
      continue;
    }

    const isCredit = abono > 0;
    const monto = isCredit ? abono : cargo;

    transactions.push({
      fecha,
      concepto: descripcion,
      monto: Math.abs(monto),
      referencia: row.Referencia?.trim() ?? null,
      isCredit,
    });

    if (!minDate || fecha < minDate) minDate = fecha;
    if (!maxDate || fecha > maxDate) maxDate = fecha;
  }

  return {
    bank: 'BBVA',
    accountNumberMasked: null,
    periodStart: minDate,
    periodEnd: maxDate,
    transactions,
  };
};

export const BANK_BBVA: BankCode = 'BBVA';
