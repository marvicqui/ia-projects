import type { LaboralDocumentType } from "./index";

export function buildLaboralExtractionPrompt(documentType: LaboralDocumentType): string {
  return [
    "Extrae datos de un documento regulatorio mexicano.",
    `Tipo esperado: ${documentType}.`,
    "Devuelve JSON con rfc, razon_social, fecha_emision, fecha_vencimiento, sentido, folio, autoridad y observaciones.",
    "Marca confidence de 0 a 1 y no inventes campos ausentes."
  ].join("\n");
}
