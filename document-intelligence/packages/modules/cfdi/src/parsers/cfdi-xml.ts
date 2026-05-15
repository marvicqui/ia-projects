import { XMLParser } from 'fast-xml-parser';
import type { CfdiComprobanteType, ParsedCfdi } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseAttributeValue: false,
  trimValues: true,
});

const toCompType = (raw: string): CfdiComprobanteType => {
  const upper = raw.toUpperCase().trim();
  if (upper === 'I' || upper === 'E' || upper === 'T' || upper === 'P' || upper === 'N') return upper;
  // SAT 3.3 used "Ingreso" / "Egreso" string. SAT 4.0 uses single letters.
  if (upper.startsWith('INGRES')) return 'I';
  if (upper.startsWith('EGRES')) return 'E';
  if (upper.startsWith('TRASLAD')) return 'T';
  if (upper.startsWith('PAGO')) return 'P';
  if (upper.startsWith('NOM')) return 'N';
  throw new Error(`Unknown TipoDeComprobante: ${raw}`);
};

export class CfdiParseError extends Error {
  constructor(message: string, public readonly raw?: string) {
    super(message);
    this.name = 'CfdiParseError';
  }
}

export const parseCfdiXml = (xml: string): ParsedCfdi => {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch (error) {
    throw new CfdiParseError(`Invalid XML: ${(error as Error).message}`);
  }

  const root = parsed.Comprobante as Record<string, unknown> | undefined;
  if (!root) throw new CfdiParseError('Missing Comprobante root element');

  const emisor = root.Emisor as Record<string, string> | undefined;
  const receptor = root.Receptor as Record<string, string> | undefined;
  const complemento = root.Complemento as Record<string, unknown> | undefined;
  const timbreFiscal = complemento?.TimbreFiscalDigital as Record<string, string> | undefined;

  if (!emisor || !receptor) throw new CfdiParseError('Missing Emisor or Receptor');
  if (!timbreFiscal?.['@_UUID']) throw new CfdiParseError('Missing TimbreFiscalDigital UUID');

  const totalStr = root['@_Total'] as string | undefined;
  if (!totalStr) throw new CfdiParseError('Missing Total attribute');

  const fechaStr = root['@_Fecha'] as string | undefined;
  if (!fechaStr) throw new CfdiParseError('Missing Fecha attribute');

  return {
    uuidSat: timbreFiscal['@_UUID']!,
    emisorRfc: emisor['@_Rfc'] ?? '',
    emisorNombre: emisor['@_Nombre'] ?? null,
    receptorRfc: receptor['@_Rfc'] ?? '',
    receptorNombre: receptor['@_Nombre'] ?? null,
    total: Number(totalStr),
    subtotal: root['@_SubTotal'] ? Number(root['@_SubTotal']) : null,
    fecha: new Date(fechaStr),
    serie: (root['@_Serie'] as string | undefined) ?? null,
    folio: (root['@_Folio'] as string | undefined) ?? null,
    comprobanteType: toCompType((root['@_TipoDeComprobante'] as string) ?? 'I'),
    formaPago: (root['@_FormaPago'] as string | undefined) ?? null,
    metodoPago: (root['@_MetodoPago'] as string | undefined) ?? null,
    moneda: (root['@_Moneda'] as string | undefined) ?? 'MXN',
  };
};
