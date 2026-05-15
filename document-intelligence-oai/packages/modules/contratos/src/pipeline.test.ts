import { describe, expect, it } from "vitest";
import { runDeterministicContractPipeline } from "./pipeline";

describe("contract pipeline", () => {
  it("flags aggressive non-compete and REPSE risk", () => {
    const result = runDeterministicContractPipeline(`
Contrato de prestacion de servicios especializados
Celebran Servicios Norte SA y Demo Constructora SA en Ciudad de Mexico.
Clausula 1. Subcontratacion. Hay subcontratacion de personal operativo para actividades especializadas.
Clausula 2. No competencia. El proveedor no podra competir en todo el territorio nacional durante 24 meses.
`);

    expect(result.summary.contractType).toBe("Subcontratacion especializada");
    expect(result.risks.some((risk) => risk.severity === "critical")).toBe(true);
    expect(result.risks.some((risk) => risk.severity === "high")).toBe(true);
  });
});
