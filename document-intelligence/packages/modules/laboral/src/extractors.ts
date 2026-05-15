import { completeWithImage } from '@jvp/shared-agents';
import type {
  ExtractedDoc,
  ExtractedRepse,
  ExtractedSat32d,
  ExtractedImss32d,
  ExtractedInfonavit,
  ExtractedCsf,
  LaboralDocType,
} from './types';

const SYSTEM_BASE = `Eres un asistente experto en documentos regulatorios mexicanos: REPSE (STPS), SAT 32-D, IMSS 32-D, INFONAVIT y CSF.
Tu tarea: extraer los campos pedidos de un PDF que ya viene como input visión.
Devuelve EXCLUSIVAMENTE un JSON valido (sin texto explicativo, sin backticks, sin markdown).
Si un campo no se encuentra, ponlo en null. Fechas en formato ISO YYYY-MM-DD.
Si el documento es ilegible o claramente no corresponde al tipo solicitado, valid=false con rationale explicando por que.`;

const PROMPTS: Record<LaboralDocType, string> = {
  repse: `Este PDF debe ser una constancia REPSE de la STPS (Registro de Prestadoras de Servicios Especializados u Obras).
Extrae:
{
  "registroNumero": "número de registro (e.g. AMEXX/202X/123)",
  "razonSocial": "razón social del prestador",
  "folio": null,
  "emittedAt": "YYYY-MM-DD fecha de emisión/registro",
  "expiresAt": "YYYY-MM-DD fecha de vencimiento (típicamente 3 años después)",
  "valid": true|false,
  "confidence": 0-1,
  "rationale": "breve nota; si valid=false explica por qué"
}`,

  sat_32d: `Este PDF debe ser una Opinion de Cumplimiento de Obligaciones Fiscales del SAT (artículo 32-D).
Extrae:
{
  "folioOpinion": "número de folio (e.g. 12345-XYZ)",
  "sentido": "positivo" | "negativo" | "no_inscrito" | "desconocido",
  "rfc": "RFC del contribuyente",
  "folio": null,
  "emittedAt": "YYYY-MM-DD fecha de la opinión",
  "expiresAt": "YYYY-MM-DD fecha de vigencia (típicamente 30 días después)",
  "valid": true|false,
  "confidence": 0-1,
  "rationale": "breve nota"
}
Reglas: valid=true SOLO si sentido='positivo'. Si negativo, no_inscrito o no se puede determinar, valid=false.`,

  imss_32d: `Este PDF debe ser una Opinion de Cumplimiento del IMSS (artículo 32-D).
Extrae:
{
  "folioOpinion": "número de folio",
  "sentido": "positivo" | "negativo" | "no_inscrito" | "desconocido",
  "rfc": "RFC del patrón",
  "registroPatronal": "registro patronal IMSS (e.g. Y1234567890)",
  "folio": null,
  "emittedAt": "YYYY-MM-DD",
  "expiresAt": "YYYY-MM-DD (típicamente 30 días)",
  "valid": true|false,
  "confidence": 0-1,
  "rationale": "breve nota"
}
valid=true SOLO si sentido='positivo'.`,

  infonavit: `Este PDF debe ser una Constancia de Situación Fiscal del INFONAVIT.
Extrae:
{
  "folioOpinion": "número de folio",
  "sentido": "positivo" | "negativo" | "no_inscrito" | "desconocido",
  "rfc": "RFC",
  "folio": null,
  "emittedAt": "YYYY-MM-DD",
  "expiresAt": "YYYY-MM-DD (típicamente 30 días)",
  "valid": true|false,
  "confidence": 0-1,
  "rationale": "breve nota"
}
valid=true SOLO si sentido='positivo'.`,

  csf: `Este PDF debe ser una Constancia de Situación Fiscal del SAT (NO confundir con Opinión de Cumplimiento).
Extrae:
{
  "rfc": "RFC",
  "razonSocial": "razón social o nombre completo",
  "regimenFiscal": "denominación del régimen fiscal",
  "codigoPostal": "código postal del domicilio fiscal",
  "folio": "folio de la constancia si aparece",
  "emittedAt": "YYYY-MM-DD fecha de emisión",
  "expiresAt": null,
  "valid": true|false,
  "confidence": 0-1,
  "rationale": "breve nota"
}
La CSF típicamente no tiene fecha de vencimiento — deja expiresAt en null.
valid=true si la constancia es del año en curso, si es muy antigua (>1 año) marca rationale pero puede seguir valid=true según política del workspace.`,
};

const safeJsonParse = (text: string): Record<string, unknown> | null => {
  // Intentar buscar el primer bloque { ... } del response.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const num = (v: unknown, fallback = 0.5): number => {
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.min(Math.max(v, 0), 1);
  return fallback;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

const sentido = (v: unknown): 'positivo' | 'negativo' | 'no_inscrito' | 'desconocido' => {
  const s = typeof v === 'string' ? v.toLowerCase().trim() : '';
  if (s === 'positivo' || s === 'negativo' || s === 'no_inscrito' || s === 'desconocido') return s;
  return 'desconocido';
};

export interface ExtractInput {
  /** PDF en base64 (sin el data: prefix) */
  pdfBase64: string;
  type: LaboralDocType;
}

export const extractLaboralDoc = async (input: ExtractInput): Promise<ExtractedDoc> => {
  const prompt = PROMPTS[input.type];
  const response = await completeWithImage(input.pdfBase64, 'application/pdf', prompt, {
    system: SYSTEM_BASE,
    maxTokens: 1200,
    temperature: 0,
  });

  const parsed = safeJsonParse(response);
  if (!parsed) {
    return baseInvalid(input.type, 'No se pudo parsear el response como JSON');
  }

  const base = {
    folio: str(parsed.folio),
    emittedAt: str(parsed.emittedAt),
    expiresAt: str(parsed.expiresAt),
    valid: bool(parsed.valid),
    confidence: num(parsed.confidence, 0.6),
    rationale: str(parsed.rationale) ?? '',
  };

  switch (input.type) {
    case 'repse':
      return {
        type: 'repse',
        ...base,
        registroNumero: str(parsed.registroNumero),
        razonSocial: str(parsed.razonSocial),
      } satisfies ExtractedRepse;

    case 'sat_32d':
      return {
        type: 'sat_32d',
        ...base,
        folioOpinion: str(parsed.folioOpinion),
        sentido: sentido(parsed.sentido),
        rfc: str(parsed.rfc),
      } satisfies ExtractedSat32d;

    case 'imss_32d':
      return {
        type: 'imss_32d',
        ...base,
        folioOpinion: str(parsed.folioOpinion),
        sentido: sentido(parsed.sentido),
        rfc: str(parsed.rfc),
        registroPatronal: str(parsed.registroPatronal),
      } satisfies ExtractedImss32d;

    case 'infonavit':
      return {
        type: 'infonavit',
        ...base,
        folioOpinion: str(parsed.folioOpinion),
        sentido: sentido(parsed.sentido),
        rfc: str(parsed.rfc),
      } satisfies ExtractedInfonavit;

    case 'csf':
      return {
        type: 'csf',
        ...base,
        rfc: str(parsed.rfc),
        razonSocial: str(parsed.razonSocial),
        regimenFiscal: str(parsed.regimenFiscal),
        codigoPostal: str(parsed.codigoPostal),
      } satisfies ExtractedCsf;
  }
};

const baseInvalid = (type: LaboralDocType, reason: string): ExtractedDoc => {
  const base = {
    folio: null,
    emittedAt: null,
    expiresAt: null,
    valid: false,
    confidence: 0,
    rationale: reason,
  };

  switch (type) {
    case 'repse':
      return { type, ...base, registroNumero: null, razonSocial: null };
    case 'sat_32d':
      return { type, ...base, folioOpinion: null, sentido: 'desconocido', rfc: null };
    case 'imss_32d':
      return { type, ...base, folioOpinion: null, sentido: 'desconocido', rfc: null, registroPatronal: null };
    case 'infonavit':
      return { type, ...base, folioOpinion: null, sentido: 'desconocido', rfc: null };
    case 'csf':
      return { type, ...base, rfc: null, razonSocial: null, regimenFiscal: null, codigoPostal: null };
  }
};
