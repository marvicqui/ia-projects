// Banamex/Citibanamex CSV. Columns vary: Fecha, Descripción, Cargo, Abono, Saldo.
// Banamex commonly uses MM/DD/YYYY date format (legacy US influence).
import Papa from 'papaparse';
import type { ParsedBankStatement, ParsedBankTransaction } from '../types';

interface BanaRow { Fecha?: string; Descripcion?: string; 'Descripción'?: string; Cargo?: string; Abono?: string }

const parseDate = (s: string): Date => {
  const parts = s.split(/[/-]/);
  if (parts.length !== 3) throw new Error(`Invalid date: ${s}`);
  const [m, d, y] = parts.map((p) => Number(p));  // MM/DD/YYYY
  if (!d || !m || !y) throw new Error(`Invalid date: ${s}`);
  return new Date(Date.UTC(y < 100 ? 2000 + y : y, m - 1, d));
};

const parseNumber = (s: string | undefined): number => {
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, '').replace(/[()]/g, '');
  return Number(cleaned) || 0;
};

export const parseBanamexCsv = (csv: string): ParsedBankStatement => {
  const result = Papa.parse<BanaRow>(csv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });

  const transactions: ParsedBankTransaction[] = [];
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const row of result.data) {
    const fechaStr = row.Fecha?.trim();
    const descripcion = (row['Descripción'] ?? row.Descripcion ?? '').trim();
    if (!fechaStr || !descripcion) continue;
    const cargo = parseNumber(row.Cargo);
    const abono = parseNumber(row.Abono);
    if (cargo === 0 && abono === 0) continue;

    let fecha: Date;
    try { fecha = parseDate(fechaStr); } catch { continue; }

    const isCredit = abono > 0;
    transactions.push({
      fecha,
      concepto: descripcion,
      monto: Math.abs(isCredit ? abono : cargo),
      referencia: null,
      isCredit,
    });
    if (!minDate || fecha < minDate) minDate = fecha;
    if (!maxDate || fecha > maxDate) maxDate = fecha;
  }

  return { bank: 'BANAMEX', accountNumberMasked: null, periodStart: minDate, periodEnd: maxDate, transactions };
};
