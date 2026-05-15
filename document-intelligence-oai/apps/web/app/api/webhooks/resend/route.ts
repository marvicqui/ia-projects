import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = (await request.json()) as unknown;
  return NextResponse.json({ received: true, payload });
}
