import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const form = await request.formData();
  return NextResponse.json({
    received: true,
    from: form.get("From"),
    body: form.get("Body")
  });
}
