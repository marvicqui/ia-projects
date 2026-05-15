import { NextResponse } from "next/server";
import { parseBankCsv, parseCfdiXml, reconcileCfdis } from "@marvicqui/cfdi";

export function GET() {
  return NextResponse.json({ module: "cfdi", status: "ready" });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { xmls?: string[]; bankCsv?: string; bank?: "bbva" | "santander" | "banamex" };
  const cfdis = (body.xmls ?? []).map(parseCfdiXml);
  const transactions = body.bankCsv ? parseBankCsv(body.bankCsv, body.bank ?? "bbva") : [];
  return NextResponse.json({ cfdis, transactions, matches: reconcileCfdis(cfdis, transactions) });
}
