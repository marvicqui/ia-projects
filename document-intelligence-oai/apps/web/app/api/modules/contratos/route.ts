import { NextResponse } from "next/server";
import { runDeterministicContractPipeline } from "@marvicqui/contratos";

export function GET() {
  return NextResponse.json({ module: "contratos", status: "ready" });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string };
  return NextResponse.json(runDeterministicContractPipeline(body.text ?? ""));
}
