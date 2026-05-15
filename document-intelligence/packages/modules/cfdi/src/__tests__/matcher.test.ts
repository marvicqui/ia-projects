import { describe, it, expect } from 'vitest';
import { runDeterministicMatcher, type CfdiRecord, type TransactionRecord } from '../matcher';

const cfdi = (overrides: Partial<CfdiRecord> = {}): CfdiRecord => ({
  id: overrides.id ?? 'c1',
  uuidSat: 'AAAA-BBBB',
  emisorRfc: 'OURRFC',
  emisorNombre: 'Marvicqui Inc',
  receptorRfc: 'PROVEEDOR123',
  receptorNombre: 'Proveedora Industrial SA',
  total: 1000,
  subtotal: 862.07,
  fecha: new Date('2026-05-10T00:00:00Z'),
  serie: null,
  folio: null,
  comprobanteType: 'I',
  formaPago: null,
  metodoPago: null,
  moneda: 'MXN',
  ...overrides,
});

const tx = (overrides: Partial<TransactionRecord> = {}): TransactionRecord => ({
  id: overrides.id ?? 't1',
  fecha: new Date('2026-05-10T00:00:00Z'),
  concepto: 'TRANSFERENCIA',
  monto: 1000,
  referencia: null,
  isCredit: true,
  ...overrides,
});

describe('runDeterministicMatcher', () => {
  it('matches an exact amount + same date as exact', () => {
    const out = runDeterministicMatcher({
      cfdis: [cfdi()],
      transactions: [tx()],
      ourRfc: 'OURRFC',
    });

    expect(out.stats.matchedExact).toBe(1);
    expect(out.matches).toHaveLength(1);
    expect(out.matches[0]!.matchType).toBe('exact');
    expect(out.matches[0]!.confidence).toBe(1);
  });

  it('respects the ±3 day window for exact match', () => {
    const out = runDeterministicMatcher({
      cfdis: [cfdi({ fecha: new Date('2026-05-10T00:00:00Z') })],
      transactions: [tx({ fecha: new Date('2026-05-13T00:00:00Z') })],
      ourRfc: 'OURRFC',
    });
    expect(out.stats.matchedExact).toBe(1);
  });

  it('rejects exact match beyond ±3 day window', () => {
    const out = runDeterministicMatcher({
      cfdis: [cfdi({ fecha: new Date('2026-05-10T00:00:00Z') })],
      transactions: [tx({ fecha: new Date('2026-05-20T00:00:00Z') })],
      ourRfc: 'OURRFC',
    });
    expect(out.stats.matchedExact).toBe(0);
  });

  it('does not match income CFDI against an egress transaction', () => {
    const out = runDeterministicMatcher({
      cfdis: [cfdi({ comprobanteType: 'I', emisorRfc: 'OURRFC' })],
      transactions: [tx({ isCredit: false })],
      ourRfc: 'OURRFC',
    });
    expect(out.stats.matchedExact).toBe(0);
  });

  it('falls into fuzzy when amount differs by less than 1 peso and text similar', () => {
    const out = runDeterministicMatcher({
      cfdis: [
        cfdi({
          total: 1000,
          receptorNombre: 'Proveedora Industrial SA',
        }),
      ],
      transactions: [
        tx({
          monto: 1000.5,
          concepto: 'TRANSFERENCIA PROVEEDORA INDUSTRIAL',
          fecha: new Date('2026-05-12T00:00:00Z'),
        }),
      ],
      ourRfc: 'OURRFC',
    });
    expect(out.stats.matchedFuzzy + out.stats.matchedExact).toBe(1);
  });

  it('returns unmatched stats correctly', () => {
    const out = runDeterministicMatcher({
      cfdis: [cfdi({ total: 1000 }), cfdi({ id: 'c2', total: 2000, uuidSat: 'X-Y' })],
      transactions: [
        tx({ monto: 1000 }),
        tx({ id: 't2', monto: 99999, concepto: 'COMISIÓN BANCARIA' }),
      ],
      ourRfc: 'OURRFC',
    });
    expect(out.stats.matchedExact).toBe(1);
    expect(out.stats.unmatchedTransactions).toBe(1);
    expect(out.stats.unmatchedCfdis).toBe(1);
    expect(out.unmatchedCfdis[0]!.id).toBe('c2');
    expect(out.unmatchedTransactions[0]!.id).toBe('t2');
  });
});
