import { defaultModels } from "@marvicqui/shared-agents";
import type { ContractClause, ContractRisk, ContractSummary } from "./index";
import { analyzeClauseRisk, classifyClause, splitContractClauses } from "./clauses";

export interface ContractPipelineResult {
  summary: ContractSummary;
  clauses: ContractClause[];
  risks: ContractRisk[];
  report: string;
  models: {
    extractor: string;
    clausulator: string;
    riskAnalyzer: string;
    reporter: string;
  };
}

export function runDeterministicContractPipeline(text: string): ContractPipelineResult {
  const clauses = splitContractClauses(text).map((clause, index) => classifyClause(clause, index));
  const risks = clauses.flatMap((clause) => {
    const risk = analyzeClauseRisk(clause);
    return risk ? [risk] : [];
  });

  const summary: ContractSummary = {
    title: inferTitle(text),
    parties: inferParties(text),
    contractType: inferContractType(text),
    jurisdiction: inferJurisdiction(text)
  };

  return {
    summary,
    clauses,
    risks,
    report: buildReport(summary, risks),
    models: {
      extractor: defaultModels.haiku,
      clausulator: defaultModels.haiku,
      riskAnalyzer: defaultModels.sonnet,
      reporter: defaultModels.haiku
    }
  };
}

function inferTitle(text: string): string {
  return text.split(/\r?\n/).find((line) => line.trim().length > 8)?.trim() ?? "Contrato sin titulo";
}

function inferParties(text: string): string[] {
  const matches = [...text.matchAll(/(?:entre|celebran)\s+([^,\n]+)\s+y\s+([^,\n]+)/gi)];
  const first = matches[0];
  return first ? [first[1]?.trim() ?? "Parte A", first[2]?.trim() ?? "Parte B"] : ["Parte A", "Parte B"];
}

function inferContractType(text: string): string {
  if (/confidencialidad|nda/i.test(text)) {
    return "NDA";
  }

  if (/servicios profesionales/i.test(text)) {
    return "Servicios profesionales";
  }

  if (/subcontrataci[oó]n|servicios especializados/i.test(text)) {
    return "Subcontratacion especializada";
  }

  return "General";
}

function inferJurisdiction(text: string): string {
  return /ciudad de mexico|cdmx/i.test(text) ? "Ciudad de Mexico" : "Mexico";
}

function buildReport(summary: ContractSummary, risks: ContractRisk[]): string {
  const highRisks = risks.filter((risk) => risk.severity === "high" || risk.severity === "critical");

  if (highRisks.length === 0) {
    return `${summary.title}: no se detectaron riesgos altos en la revision inicial.`;
  }

  return `${summary.title}: se detectaron ${highRisks.length} riesgos altos o criticos que requieren revision antes de firma.`;
}
