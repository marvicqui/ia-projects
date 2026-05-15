import type {
  MatchCandidate,
  ParsedBankTransaction,
  ParsedCfdi,
  ReconciliationStats,
} from './types';

export interface CfdiRecord extends ParsedCfdi {
  id: string;
}

export interface TransactionRecord extends ParsedBankTransaction {
  id: string;
}

export interface MatcherOptions {
  exactDateWindowDays?: number;     // default 3
  fuzzyDateWindowDays?: number;     // default 5
  fuzzyAmountTolerance?: number;    // default 1.0 (peso)
  fuzzyTextThreshold?: number;      // default 0.55
  llmConfidenceThreshold?: number;  // default 0.7
  enableLlm?: boolean;              // if false, pass 3 is skipped
}

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (a: Date, b: Date): number =>
  Math.abs((a.getTime() - b.getTime()) / DAY_MS);

// Dice coefficient on bigrams. Cheap fuzzy string similarity. Returns 0..1.
const stringSimilarity = (a: string, b: string): number => {
  const sa = a.toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').trim();
  const sb = b.toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').trim();
  if (!sa.length || !sb.length) return 0;
  if (sa === sb) return 1;

  const bigrams = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const k = s.slice(i, i + 2);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };

  const ma = bigrams(sa);
  const mb = bigrams(sb);
  let intersection = 0;
  for (const [k, va] of ma) {
    const vb = mb.get(k);
    if (vb) intersection += Math.min(va, vb);
  }
  const total = (sa.length - 1) + (sb.length - 1);
  return total === 0 ? 0 : (2 * intersection) / total;
};

const looksLikeIncome = (cfdi: ParsedCfdi, our: string): boolean =>
  cfdi.comprobanteType === 'I' && cfdi.emisorRfc.toUpperCase() === our.toUpperCase();

const looksLikeExpense = (cfdi: ParsedCfdi, our: string): boolean =>
  (cfdi.comprobanteType === 'E' || cfdi.comprobanteType === 'I') &&
  cfdi.receptorRfc.toUpperCase() === our.toUpperCase();

const direction = (cfdi: ParsedCfdi, ourRfc: string | null): 'in' | 'out' | 'unknown' => {
  if (!ourRfc) return 'unknown';
  if (looksLikeIncome(cfdi, ourRfc)) return 'in';
  if (looksLikeExpense(cfdi, ourRfc)) return 'out';
  return 'unknown';
};

interface MatcherInput {
  cfdis: CfdiRecord[];
  transactions: TransactionRecord[];
  ourRfc?: string | null;
  options?: MatcherOptions;
}

interface MatcherOutput {
  matches: MatchCandidate[];
  unmatchedCfdis: CfdiRecord[];
  unmatchedTransactions: TransactionRecord[];
  stats: ReconciliationStats;
}

export const runDeterministicMatcher = (input: MatcherInput): MatcherOutput => {
  const {
    cfdis,
    transactions,
    ourRfc = null,
    options = {},
  } = input;

  const exactWindow = options.exactDateWindowDays ?? 3;
  const fuzzyWindow = options.fuzzyDateWindowDays ?? 5;
  const fuzzyAmountTol = options.fuzzyAmountTolerance ?? 1.0;
  const fuzzyTextThreshold = options.fuzzyTextThreshold ?? 0.55;

  const matches: MatchCandidate[] = [];
  const usedCfdi = new Set<string>();
  const usedTx = new Set<string>();

  // Pass 1 — exact: same amount, same direction, date ± exactWindow days.
  for (const tx of transactions) {
    if (usedTx.has(tx.id)) continue;
    for (const cfdi of cfdis) {
      if (usedCfdi.has(cfdi.id)) continue;
      if (Math.abs(cfdi.total - tx.monto) > 0.01) continue;

      const dir = direction(cfdi, ourRfc);
      if (dir === 'in' && !tx.isCredit) continue;
      if (dir === 'out' && tx.isCredit) continue;

      if (daysBetween(cfdi.fecha, tx.fecha) > exactWindow) continue;

      matches.push({
        cfdiId: cfdi.id,
        transactionId: tx.id,
        matchType: 'exact',
        confidence: 1.0,
        reviewStatus: 'auto',
        rationale: `Monto exacto ${cfdi.total} y fecha dentro de ±${exactWindow} días.`,
      });
      usedCfdi.add(cfdi.id);
      usedTx.add(tx.id);
      break;
    }
  }

  // Pass 2 — fuzzy: amount ± fuzzyAmountTol, date ± fuzzyWindow, text similarity.
  for (const tx of transactions) {
    if (usedTx.has(tx.id)) continue;
    let best: { cfdi: CfdiRecord; score: number } | null = null;

    for (const cfdi of cfdis) {
      if (usedCfdi.has(cfdi.id)) continue;
      if (Math.abs(cfdi.total - tx.monto) > fuzzyAmountTol) continue;

      const dir = direction(cfdi, ourRfc);
      if (dir === 'in' && !tx.isCredit) continue;
      if (dir === 'out' && tx.isCredit) continue;

      if (daysBetween(cfdi.fecha, tx.fecha) > fuzzyWindow) continue;

      const counterparty = dir === 'in' ? cfdi.receptorNombre : cfdi.emisorNombre;
      const counterpartyRfc = dir === 'in' ? cfdi.receptorRfc : cfdi.emisorRfc;
      const candidates = [counterparty, counterpartyRfc, cfdi.folio, cfdi.serie].filter(
        (s): s is string => Boolean(s),
      );
      let textScore = 0;
      for (const c of candidates) {
        textScore = Math.max(textScore, stringSimilarity(c, tx.concepto));
      }

      if (textScore < fuzzyTextThreshold) continue;

      const amountDiff = Math.abs(cfdi.total - tx.monto);
      const dateDiff = daysBetween(cfdi.fecha, tx.fecha);
      const score =
        0.55 * textScore +
        0.30 * (1 - amountDiff / Math.max(fuzzyAmountTol, 0.01)) +
        0.15 * (1 - dateDiff / fuzzyWindow);

      if (!best || score > best.score) best = { cfdi, score };
    }

    if (best) {
      matches.push({
        cfdiId: best.cfdi.id,
        transactionId: tx.id,
        matchType: 'fuzzy',
        confidence: Number(best.score.toFixed(3)),
        reviewStatus: best.score >= 0.75 ? 'auto' : 'pending',
        rationale: `Match difuso por similitud de texto/monto/fecha. Score ${best.score.toFixed(3)}.`,
      });
      usedCfdi.add(best.cfdi.id);
      usedTx.add(tx.id);
    }
  }

  const unmatchedCfdis = cfdis.filter((c) => !usedCfdi.has(c.id));
  const unmatchedTransactions = transactions.filter((t) => !usedTx.has(t.id));

  const stats: ReconciliationStats = {
    totalTransactions: transactions.length,
    totalCfdis: cfdis.length,
    matchedExact: matches.filter((m) => m.matchType === 'exact').length,
    matchedFuzzy: matches.filter((m) => m.matchType === 'fuzzy').length,
    matchedLlm: 0,
    unmatchedTransactions: unmatchedTransactions.length,
    unmatchedCfdis: unmatchedCfdis.length,
  };

  return { matches, unmatchedCfdis, unmatchedTransactions, stats };
};

// Pass 3 — LLM inference. Sends remaining unmatched transactions to Claude
// with candidate CFDIs and asks for a structured match decision.
// We do this lazily: only call the LLM if there's at least 1 unmatched tx + 1 unmatched cfdi.
interface LlmDecision {
  transactionId: string;
  cfdiId: string | null;
  confidence: number;
  rationale: string;
}

export const inferMatchesWithLlm = async (
  unmatchedTx: TransactionRecord[],
  unmatchedCfdis: CfdiRecord[],
  call: (system: string, prompt: string) => Promise<string>,
  threshold = 0.7,
): Promise<MatchCandidate[]> => {
  if (!unmatchedTx.length || !unmatchedCfdis.length) return [];

  const system = `Eres un contador mexicano experto en CFDI 4.0 y conciliación bancaria.
Te doy transacciones bancarias sin CFDI emparejado y una lista de CFDIs sin emparejar.
Tu tarea: por cada transacción, decide si algún CFDI corresponde (mismo evento económico, posible diferencia de fecha o monto por timing de cobranza).
Devuelve SOLO JSON válido con la forma:
[{ "transactionId": "...", "cfdiId": "..." | null, "confidence": 0-1, "rationale": "explicación corta" }]
Considera: dirección (CFDI tipo I emitido = ingreso bancario; tipo E o I recibido = egreso), redondeos, fechas con desfase normal de 1-2 semanas.`;

  const prompt = JSON.stringify(
    {
      transactions: unmatchedTx.slice(0, 30).map((t) => ({
        id: t.id,
        fecha: t.fecha.toISOString().slice(0, 10),
        concepto: t.concepto,
        monto: t.monto,
        direccion: t.isCredit ? 'ingreso' : 'egreso',
      })),
      cfdis: unmatchedCfdis.slice(0, 60).map((c) => ({
        id: c.id,
        fecha: c.fecha.toISOString().slice(0, 10),
        emisor: c.emisorNombre ?? c.emisorRfc,
        receptor: c.receptorNombre ?? c.receptorRfc,
        total: c.total,
        tipo: c.comprobanteType,
      })),
    },
    null,
    0,
  );

  const response = await call(system, prompt);
  const match = response.match(/\[[\s\S]*\]/);
  if (!match) return [];

  let decisions: LlmDecision[];
  try {
    decisions = JSON.parse(match[0]) as LlmDecision[];
  } catch {
    return [];
  }

  return decisions
    .filter((d): d is LlmDecision => Boolean(d.transactionId) && Boolean(d.cfdiId))
    .map((d) => ({
      transactionId: d.transactionId,
      cfdiId: d.cfdiId!,
      matchType: 'llm_inferred' as const,
      confidence: Math.min(Math.max(d.confidence, 0), 1),
      reviewStatus: (d.confidence >= threshold ? 'auto' : 'pending') as 'auto' | 'pending',
      rationale: `LLM (Claude): ${d.rationale}`.slice(0, 500),
    }));
};
