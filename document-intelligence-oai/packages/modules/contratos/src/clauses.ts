import type { ContractClause, ContractRisk } from "./index";

const clauseTypes = [
  ["indemnizacion", /indemniza|responsabilidad|danos/i],
  ["terminacion", /terminaci[oó]n|rescisi[oó]n/i],
  ["confidencialidad", /confidencial|secreto/i],
  ["no_compete", /no competir|competencia|exclusividad/i],
  ["propiedad_intelectual", /propiedad intelectual|derechos de autor|licencia/i],
  ["fuerza_mayor", /fuerza mayor|caso fortuito/i],
  ["repse", /repse|servicios especializados|subcontrataci[oó]n/i]
] as const;

export function splitContractClauses(text: string): string[] {
  return text
    .split(/\n\s*(?:cl[aá]usula|secci[oó]n)\s+\d+[.:,-]?\s*/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 40);
}

export function classifyClause(text: string, index: number): ContractClause {
  const clauseType = clauseTypes.find(([, pattern]) => pattern.test(text))?.[0] ?? "general";
  const severity = inferSeverity(clauseType, text);

  return {
    id: `clause-${index + 1}`,
    type: clauseType,
    text,
    severity
  };
}

export function analyzeClauseRisk(clause: ContractClause): ContractRisk | null {
  if (clause.severity === "low") {
    return null;
  }

  return {
    clauseId: clause.id,
    severity: clause.severity,
    finding: buildFinding(clause),
    recommendation: buildRecommendation(clause)
  };
}

function inferSeverity(type: string, text: string): ContractClause["severity"] {
  if (type === "no_compete" && /24 meses|dos anos|dos años|territorio nacional/i.test(text)) {
    return "high";
  }

  if (type === "repse" && /subcontrataci[oó]n/i.test(text) && !/repse/i.test(text)) {
    return "critical";
  }

  if (/sin limite|ilimitad|penalidad/i.test(text)) {
    return "high";
  }

  return type === "general" ? "low" : "medium";
}

function buildFinding(clause: ContractClause): string {
  if (clause.type === "no_compete") {
    return "La clausula de no competencia puede ser desproporcionada para Mexico.";
  }

  if (clause.type === "repse") {
    return "El contrato involucra subcontratacion y no acredita obligaciones REPSE suficientes.";
  }

  return "La clausula requiere revision legal antes de firma.";
}

function buildRecommendation(clause: ContractClause): string {
  if (clause.type === "repse") {
    return "Agregar obligaciones REPSE, evidencia documental y derecho de rescindir ante incumplimiento.";
  }

  return "Acotar alcance, vigencia, responsabilidad y remedios contractuales.";
}
