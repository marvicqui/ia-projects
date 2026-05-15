import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  return NextResponse.redirect(new URL(next, request.url));
}
