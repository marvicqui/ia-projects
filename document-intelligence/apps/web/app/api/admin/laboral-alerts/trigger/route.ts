import { guardAdmin } from '@/lib/admin';
import { runLaboralAlerts } from '@/lib/laboral-alerts';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export const POST = async (request: Request) => {
  await guardAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  try {
    const result = await runLaboralAlerts(appUrl);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
};
