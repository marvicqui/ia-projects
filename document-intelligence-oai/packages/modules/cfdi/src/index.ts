export interface ParsedCfdi {
  uuid: string;
  issuerRfc: string;
  receiverRfc: string;
  total: number;
  issuedAt: string;
  type: "I" | "E" | "P" | "N" | "T";
}

export interface BankTransaction {
  id: string;
  date: string;
  concept: string;
  amount: number;
  reference?: string;
}

export interface ReconciliationMatch {
  cfdiUuid: string;
  transactionId: string;
  matchType: "exact" | "fuzzy" | "llm_inferred" | "manual";
  confidence: number;
  reason: string;
}
