import ExcelJS from 'exceljs';
import type { MatchCandidate, ParsedBankTransaction, ParsedCfdi } from './types';

export interface ExcelExportInput {
  workspaceName: string;
  reconciliationName: string;
  cfdisById: Record<string, ParsedCfdi & { id: string }>;
  txsById: Record<string, ParsedBankTransaction & { id: string }>;
  matches: MatchCandidate[];
  unmatchedCfdis: ReadonlyArray<ParsedCfdi & { id: string }>;
  unmatchedTransactions: ReadonlyArray<ParsedBankTransaction & { id: string }>;
}

const fmtDate = (d: Date): string => d.toISOString().slice(0, 10);
const fmtMoney = (n: number): string => n.toFixed(2);

export const buildReconciliationWorkbook = async (input: ExcelExportInput): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'JVP Document Intelligence';
  wb.created = new Date();

  const matchesSheet = wb.addWorksheet('Matches');
  matchesSheet.columns = [
    { header: 'CFDI Fecha', key: 'cfdiFecha', width: 12 },
    { header: 'CFDI Total', key: 'cfdiTotal', width: 14 },
    { header: 'Emisor RFC', key: 'emisor', width: 16 },
    { header: 'Receptor RFC', key: 'receptor', width: 16 },
    { header: 'UUID SAT', key: 'uuid', width: 38 },
    { header: 'Tx Fecha', key: 'txFecha', width: 12 },
    { header: 'Tx Monto', key: 'txMonto', width: 14 },
    { header: 'Tx Concepto', key: 'txConcepto', width: 40 },
    { header: 'Match', key: 'matchType', width: 12 },
    { header: 'Confidence', key: 'confidence', width: 12 },
    { header: 'Estado', key: 'reviewStatus', width: 12 },
    { header: 'Rationale', key: 'rationale', width: 60 },
  ];
  matchesSheet.getRow(1).font = { bold: true };

  for (const m of input.matches) {
    const cfdi = input.cfdisById[m.cfdiId];
    const tx = input.txsById[m.transactionId];
    if (!cfdi || !tx) continue;
    matchesSheet.addRow({
      cfdiFecha: fmtDate(cfdi.fecha),
      cfdiTotal: Number(fmtMoney(cfdi.total)),
      emisor: cfdi.emisorRfc,
      receptor: cfdi.receptorRfc,
      uuid: cfdi.uuidSat,
      txFecha: fmtDate(tx.fecha),
      txMonto: Number(fmtMoney(tx.monto)),
      txConcepto: tx.concepto,
      matchType: m.matchType,
      confidence: m.confidence,
      reviewStatus: m.reviewStatus,
      rationale: m.rationale,
    });
  }

  const unmatchedCfdiSheet = wb.addWorksheet('CFDIs sin emparejar');
  unmatchedCfdiSheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Total', key: 'total', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 8 },
    { header: 'Emisor', key: 'emisor', width: 30 },
    { header: 'Receptor', key: 'receptor', width: 30 },
    { header: 'UUID', key: 'uuid', width: 38 },
  ];
  unmatchedCfdiSheet.getRow(1).font = { bold: true };
  for (const c of input.unmatchedCfdis) {
    unmatchedCfdiSheet.addRow({
      fecha: fmtDate(c.fecha),
      total: Number(fmtMoney(c.total)),
      tipo: c.comprobanteType,
      emisor: c.emisorNombre ?? c.emisorRfc,
      receptor: c.receptorNombre ?? c.receptorRfc,
      uuid: c.uuidSat,
    });
  }

  const unmatchedTxSheet = wb.addWorksheet('Tx sin emparejar');
  unmatchedTxSheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Dirección', key: 'dir', width: 10 },
    { header: 'Concepto', key: 'concepto', width: 60 },
    { header: 'Referencia', key: 'referencia', width: 20 },
  ];
  unmatchedTxSheet.getRow(1).font = { bold: true };
  for (const t of input.unmatchedTransactions) {
    unmatchedTxSheet.addRow({
      fecha: fmtDate(t.fecha),
      monto: Number(fmtMoney(t.monto)),
      dir: t.isCredit ? 'Ingreso' : 'Egreso',
      concepto: t.concepto,
      referencia: t.referencia,
    });
  }

  const summarySheet = wb.addWorksheet('Resumen');
  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 30 },
    { header: 'Valor', key: 'value', width: 20 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRows([
    { metric: 'Workspace', value: input.workspaceName },
    { metric: 'Conciliación', value: input.reconciliationName },
    { metric: 'Generado', value: new Date().toISOString() },
    { metric: 'CFDIs totales', value: input.unmatchedCfdis.length + input.matches.length },
    { metric: 'Transacciones totales', value: input.unmatchedTransactions.length + input.matches.length },
    { metric: 'Matches exactos', value: input.matches.filter((m) => m.matchType === 'exact').length },
    { metric: 'Matches difusos', value: input.matches.filter((m) => m.matchType === 'fuzzy').length },
    { metric: 'Matches LLM', value: input.matches.filter((m) => m.matchType === 'llm_inferred').length },
    { metric: 'CFDIs sin emparejar', value: input.unmatchedCfdis.length },
    { metric: 'Transacciones sin CFDI', value: input.unmatchedTransactions.length },
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
