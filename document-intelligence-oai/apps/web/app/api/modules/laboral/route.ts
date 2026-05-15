import { NextResponse } from "next/server";
import { aggregateContractorStatus, calculateComplianceLevel, type LaboralDocumentStatus, type LaboralDocumentType } from "@marvicqui/laboral";

export function GET() {
  return NextResponse.json({ module: "laboral", status: "ready" });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { documents?: Array<{ type: string; expiresAt?: string | null; isValid: boolean }> };
  const statuses: LaboralDocumentStatus[] = (body.documents ?? []).map((document) => {
    const expiresAt = document.expiresAt ?? null;
    const status: LaboralDocumentStatus = {
      type: toDocumentType(document.type),
      level: calculateComplianceLevel({ expiresAt, isValid: document.isValid })
    };

    return expiresAt ? { ...status, expiresAt } : status;
  });

  return NextResponse.json({ statuses, contractorStatus: aggregateContractorStatus(statuses) });
}

function toDocumentType(value: string): LaboralDocumentType {
  const allowed: LaboralDocumentType[] = ["repse", "sat_32d", "imss_32d", "infonavit", "csf"];
  return allowed.includes(value as LaboralDocumentType) ? (value as LaboralDocumentType) : "csf";
}
