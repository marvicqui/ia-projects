import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ queued: true, workflow: "daily-compliance-check" });
}
