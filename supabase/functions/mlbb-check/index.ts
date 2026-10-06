import { z } from "https://esm.sh/zod@3.25.76";
import { buildCorsHeaders } from "../_shared/cors.ts";

const Schema = z.object({ id: z.string().regex(/^\d{3,15}$/), zone: z.string().regex(/^\d{1,8}$/) });

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ status: "error", message: "invalid_input" }, 400);
    const { id, zone } = parsed.data;
    const res = await fetch(
      `https://www.gameshopbot.online/mlbb_checkrole-main/api/games/mlbb_checkrole?id=${id}&zone=${zone}`,
    );
    const data = await res.json().catch(() => ({ status: "error", message: "bad_response" }));
    // Always 200 so the client can read the provider's message (e.g. "Player not found").
    return json(data);
  } catch (e) {
    console.error(e);
    return json({ status: "error", message: "server_error" }, 500);
  }
});
