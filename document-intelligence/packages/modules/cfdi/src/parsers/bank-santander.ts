// Santander "Estado de cuenta" CSV. Columns: Fecha, Concepto, Cargo, Abono, Saldo.
// Format is similar to BBVA but with semicolon delimiter in some products.
import Papa from 'papaparse';
import type { ParsedBankStatement, ParsedBankTransaction } from '../types';

interface SantRow { Fecha?: string; Concepto?: string; Cargo?: string; Abono?: string }

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
  return Number(cleaned) || 0;
};

export const parseSantanderCsv = (csv: string): ParsedBankStatement => {
  // Detect delimiter
  const delimiter = csv.split('\n')[0]?.includes(';') ? ';' : ',';
  const result = Papa.parse<SantRow>(csv, { header: true, skipEmptyLines: true, delimiter, transformHeader: (h) => h.trim() });

  const transactions: ParsedBankTransaction[] = [];
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const row of result.data) {
    const fechaStr = row.Fecha?.trim();
    if (!fechaStr || !row.Concepto) continue;
    const cargo = parseNumber(row.Cargo);
    const abono = parseNumber(row.Abono);
    if (cargo === 0 && abono === 0) continue;

    let fecha: Date;
    try { fecha = parseDate(fechaStr); } catch { continue; }

    const isCredit = abono > 0;
    transactions.push({
      fecha,
      concepto: row.Concepto.trim(),
      monto: Math.abs(isCredit ? abono : cargo),
      referencia: null,
      isCredit,
    });
    if (!minDate || fecha < minDate) minDate = fecha;
    if (!maxDate || fecha > maxDate) maxDate = fecha;
  }

  return { bank: 'SANTANDER', accountNumberMasked: null, periodStart: minDate, periodEnd: maxDate, transactions };
};
