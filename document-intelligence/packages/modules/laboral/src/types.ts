export type LaboralDocType = 'repse' | 'sat_32d' | 'imss_32d' | 'infonavit' | 'csf';

export type ComplianceLevel = 'compliant' | 'expiring' | 'expired' | 'invalid' | 'missing';

export interface ExtractedDocBase {
  /** Cadena del documento si Claude la encontró (folio, ID, etc) */
  folio: string | null;
  /** Fecha de emisión / generación del documento */
  emittedAt: string | null;
  /** Fecha de vencimiento; null si el documento no vence (CSF típicamente) */
  expiresAt: string | null;
  /** true si el documento parece válido (opinión positiva, vigente, no rechazado) */
  valid: boolean;
  /** Confianza 0-1 que el extractor reporta */
  confidence: number;
  /** Notas o razón si valid=false */
  rationale: string;
}

export interface ExtractedRepse extends ExtractedDocBase {
  type: 'repse';
  /** Número de Registro REPSE — STPS */
  registroNumero: string | null;
  /** Razón social del prestador en el REPSE */
  razonSocial: string | null;
}

export interface ExtractedSat32d extends ExtractedDocBase {
  type: 'sat_32d';
  /** Folio de la opinión */
  folioOpinion: string | null;
  /** "POSITIVO" | "NEGATIVO" | "NO INSCRITO" */
  sentido: 'positivo' | 'negativo' | 'no_inscrito' | 'desconocido';
  /** RFC al que aplica */
  rfc: string | null;
}

export interface ExtractedImss32d extends ExtractedDocBase {
  type: 'imss_32d';
  folioOpinion: string | null;
  sentido: 'positivo' | 'negativo' | 'no_inscrito' | 'desconocido';
  rfc: string | null;
  registroPatronal: string | null;
}

export interface ExtractedInfonavit extends ExtractedDocBase {
  type: 'infonavit';
  folioOpinion: string | null;
  sentido: 'positivo' | 'negativo' | 'no_inscrito' | 'desconocido';
  rfc: string | null;
}

export interface ExtractedCsf extends ExtractedDocBase {
  type: 'csf';
  rfc: string | null;
  razonSocial: string | null;
  regimenFiscal: string | null;
  codigoPostal: string | null;
}

export type ExtractedDoc =
  | ExtractedRepse
  | ExtractedSat32d
  | ExtractedImss32d
  | ExtractedInfonavit
  | ExtractedCsf;

export interface ComputeComplianceInput {
  valid: boolean;
  expiresAt: string | null;
  /** Días antes del vencimiento que se considera "por vencer" (default 7) */
  expiringDays?: number;
  /** Fecha de referencia (default now()) */
  asOf?: Date;
}
