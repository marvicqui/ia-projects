import type { BankTransaction, ParsedCfdi, ReconciliationMatch } from "./index";

export function reconcileCfdis(cfdis: ParsedCfdi[], transactions: BankTransaction[]): ReconciliationMatch[] {
  const matches: ReconciliationMatch[] = [];
  const usedTransactions = new Set<string>();

  for (const cfdi of cfdis) {
    const exact = transactions.find(
      (transaction) =>
        !usedTransactions.has(transaction.id) &&
        Math.abs(transaction.amount - cfdi.total) < 0.01 &&
        daysBetween(transaction.date, cfdi.issuedAt) <= 3
    );

    if (exact) {
      usedTransactions.add(exact.id);
      matches.push(toMatch(cfdi, exact, "exact", 1, "Monto identico y fecha dentro de +/- 3 dias"));
      continue;
    }

    const fuzzy = transactions.find(
      (transaction) =>
        !usedTransactions.has(transaction.id) &&
        Math.abs(transaction.amount - cfdi.total) <= 1 &&
        daysBetween(transaction.date, cfdi.issuedAt) <= 5 &&
        textSimilarity(transaction.concept, `${cfdi.issuerRfc} ${cfdi.receiverRfc}`) >= 0.18
    );

    if (fuzzy) {
      usedTransactions.add(fuzzy.id);
      matches.push(toMatch(cfdi, fuzzy, "fuzzy", 0.82, "Monto similar, fecha cercana y texto relacionado"));
    }
  }

  return matches;
}

function toMatch(
  cfdi: ParsedCfdi,
  transaction: BankTransaction,
  matchType: ReconciliationMatch["matchType"],
  confidence: number,
  reason: string
): ReconciliationMatch {
  return {
    cfdiUuid: cfdi.uuid,
    transactionId: transaction.id,
    matchType,
    confidence,
    reason
  };
}

function daysBetween(a: string, b: string): number {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Math.abs(left - right) / 86_400_000;
}

function textSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
  const union = new Set([...leftTokens, ...rightTokens]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9ñ&]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}
