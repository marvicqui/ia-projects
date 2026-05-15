export type CfdiComprobanteType = 'I' | 'E' | 'T' | 'P' | 'N';
export type BankCode = 'BBVA' | 'SANTANDER' | 'BANAMEX' | 'OTRO';
export type MatchType = 'exact' | 'fuzzy' | 'llm_inferred' | 'manual';
export type MatchReviewStatus = 'auto' | 'pending' | 'confirmed' | 'rejected';

export interface ParsedCfdi {
  uuidSat: string;
  emisorRfc: string;
  emisorNombre: string | null;
  receptorRfc: string;
  receptorNombre: string | null;
  total: number;
  subtotal: number | null;
  fecha: Date;
  serie: string | null;
  folio: string | null;
  comprobanteType: CfdiComprobanteType;
  formaPago: string | null;
  metodoPago: string | null;
  moneda: string;
}

export interface ParsedBankTransaction {
  fecha: Date;
  concepto: string;
  monto: number;        // always positive
  referencia: string | null;
  isCredit: boolean;    // true = deposit (ingreso), false = withdrawal (egreso)
}

export interface ParsedBankStatement {
  bank: BankCode;
  accountNumberMasked: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  transactions: ParsedBankTransaction[];
}

export interface MatchCandidate {
  cfdiId: string;
  transactionId: string;
  matchType: MatchType;
  confidence: number;     // 0..1
  reviewStatus: MatchReviewStatus;
  rationale: string;
}

export interface ReconciliationStats {
  totalTransactions: number;
  totalCfdis: number;
  matchedExact: number;
  matchedFuzzy: number;
  matchedLlm: number;
  unmatchedTransactions: number;
  unmatchedCfdis: number;
}
