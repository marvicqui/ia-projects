import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  const payload = await request.json();
  return Response.json({
    ok: true,
    channel: payload.channel ?? "system"
  });
});
