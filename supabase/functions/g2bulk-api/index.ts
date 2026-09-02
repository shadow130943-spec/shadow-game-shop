// G2Bulk API proxy
// Wraps the G2Bulk v1 endpoints with the reseller key stored server-side.
// Preserves the response contract previously served by shadow-gameshop:
//   { success, games: [{ game_code, game_name, image_url, packages: [...] }] }
// USD prices from G2Bulk are converted to MMK using G2BULK_USD_TO_MMK
// (defaults to 4500). Admin-controlled profit margins (package > game >
// global) are then applied on top of the MMK base price.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.g2bulk.com/v1";
const API_KEY = Deno.env.get("G2BULK_API_KEY") || "";
const USD_TO_MMK_FALLBACK = Number(Deno.env.get("G2BULK_USD_TO_MMK") || "4500") || 4500;

async function loadUsdToMmk(): Promise<number> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "usd_to_mmk")
      .maybeSingle();
    const n = Number(data?.value);
    return Number.isFinite(n) && n > 0 ? n : USD_TO_MMK_FALLBACK;
  } catch {
    return USD_TO_MMK_FALLBACK;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function g2Fetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { res, data, text };
}

interface MarginRow {
  scope: "global" | "game" | "package";
  game_code: string | null;
  catalogue_name: string | null;
  margin_percent: number;
}

async function loadMargins() {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabaseAdmin
    .from("profit_margins")
    .select("scope, game_code, catalogue_name, margin_percent");
  if (error) {
    console.error("[g2bulk-api] load margins error:", error.message);
    return { global: 0, game: new Map<string, number>(), pkg: new Map<string, number>() };
  }
  let globalPct = 0;
  const game = new Map<string, number>();
  const pkg = new Map<string, number>();
  for (const r of (data || []) as MarginRow[]) {
    if (r.scope === "global") globalPct = Number(r.margin_percent) || 0;
    else if (r.scope === "game" && r.game_code) game.set(r.game_code, Number(r.margin_percent) || 0);
    else if (r.scope === "package" && r.game_code && r.catalogue_name)
      pkg.set(`${r.game_code}::${r.catalogue_name}`, Number(r.margin_percent) || 0);
  }
  return { global: globalPct, game, pkg };
}

function pickMargin(
  margins: { global: number; game: Map<string, number>; pkg: Map<string, number> },
  gameCode: string,
  catalogueName: string,
) {
  const pkgKey = `${gameCode}::${catalogueName}`;
  if (margins.pkg.has(pkgKey)) return margins.pkg.get(pkgKey)!;
  if (margins.game.has(gameCode)) return margins.game.get(gameCode)!;
  return margins.global;
}


async function listProducts() {
  // 1. List all supported games.
  const gamesResp = await g2Fetch("/games", { method: "GET" });
  if (!gamesResp.res.ok || !gamesResp.data?.success) {
    return json({
      success: false,
      message: gamesResp.data?.message || `Failed to fetch games (${gamesResp.res.status})`,
    }, gamesResp.res.status || 500);
  }
  const games: Array<{ code: string; name: string; image_url?: string }> =
    gamesResp.data.games || [];

  // 2. Fetch every catalogue in parallel.
  const catalogues = await Promise.all(
    games.map(async (g) => {
      const r = await g2Fetch(`/games/${encodeURIComponent(g.code)}/catalogue`, { method: "GET" });
      if (!r.res.ok || !r.data?.success) return { code: g.code, catalogues: [] as any[] };
      return { code: g.code, catalogues: (r.data.catalogues || []) as any[] };
    }),
  );
  const catByCode = new Map(catalogues.map((c) => [c.code, c.catalogues]));

  // 3. Load margins + live USD→MMK once and build payload.
  const [margins, usdToMmk] = await Promise.all([loadMargins(), loadUsdToMmk()]);
  const payloadGames = games.map((g) => {
    const items = catByCode.get(g.code) || [];
    const packages = items.map((it: any) => {
      const usd = Number(it.amount) || 0;
      const baseMmk = Math.round(usd * usdToMmk);
      const pct = pickMargin(margins, g.code, it.name);
      const finalMmk = Math.round(baseMmk * (1 + pct / 100));
      return {
        catalogue_id: it.id,
        catalogue_name: it.name,
        price_usd: usd,
        api_price_mmk: baseMmk,
        margin_percent: pct,
        price_mmk: finalMmk,
        reseller_price_mmk: finalMmk,
      };
    });
    return {
      game_code: g.code,
      game_name: g.name,
      image_url: g.image_url || null,
      packages,
    };
  });

  return json({ success: true, games: payloadGames });
}

async function checkPlayerId(body: any) {
  const { game, user_id, server_id, charname } = body || {};
  if (!game || !user_id) {
    return json({ success: false, error_type: "INVALID_USER", message: "Missing game/user_id" }, 200);
  }
  const payload: Record<string, unknown> = { game, user_id };
  if (server_id) payload.server_id = server_id;
  if (charname) payload.charname = charname;

  let res: Response, data: any;
  try {
    const r = await g2Fetch("/games/checkPlayerId", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    res = r.res;
    data = r.data;
  } catch (err: any) {
    console.error("[g2bulk-api] checkPlayerId network error:", err?.message);
    return json({ success: false, error_type: "SYSTEM_ERROR", message: "Upstream unreachable" }, 500);
  }

  console.log("[g2bulk-api] checkPlayerId status:", res.status);

  const msg = String(data?.message || data?.detail?.message || data?.error || "").toLowerCase();
  const isValid = data?.valid === "valid" && !!data?.name;

  if (isValid) {
    return json({ success: true, ...data }, 200);
  }

  const invalidByMessage =
    /invalid|not\s*found|wrong|incorrect|no\s*such|does\s*not\s*exist|unknown user|user id/i.test(msg);

  // Upstream 5xx with no invalid-user signal => genuine system failure.
  if (res.status >= 500 && !invalidByMessage) {
    return json({ success: false, error_type: "SYSTEM_ERROR", message: data?.message || "Upstream error" }, 500);
  }

  // Everything else (400/404/422 or success:false) is treated as an invalid user input.
  return json({
    success: false,
    error_type: "INVALID_USER",
    message: data?.message || "Invalid player id / username",
    upstream: data,
  }, 200);
}


async function placeOrder(body: any) {
  const { game, catalogue_name, player_id, server_id, charname, remark } = body || {};
  if (!game || !catalogue_name || !player_id) {
    return json({ success: false, message: "Missing game/catalogue_name/player_id" }, 400);
  }
  const payload: Record<string, unknown> = { catalogue_name, player_id };
  if (server_id) payload.server_id = server_id;
  if (charname) payload.charname = charname;
  if (remark) payload.remark = remark;

  const { res, data, text } = await g2Fetch(
    `/games/${encodeURIComponent(game)}/order`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  console.log("[g2bulk-api] placeOrder status:", res.status, "resp:", text.slice(0, 300));

  const rawMsg: string = (data?.message || data?.detail?.message || "").toString();
  const msg = rawMsg.toLowerCase();

  if (!data?.success) {
    if (res.status === 401 || msg.includes("unauthorized") || msg.includes("invalid key")) {
      return json({
        success: false,
        invalid_reseller_session: true,
        message: "G2Bulk API key is invalid or unauthorized. Please update G2BULK_API_KEY.",
        upstream: data,
      }, 200);
    }
  }


  // Normalize a top-level message so the frontend toast works cleanly.
  if (data && !data.message && data?.order?.player_name) {
    data.message = `Order placed for ${data.order.player_name}`;
  }
  return json(data, 200);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!API_KEY) {
    return json({ success: false, message: "G2BULK_API_KEY not configured" }, 500);
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    if (!action) return json({ success: false, message: "Missing action" }, 400);

    if (action === "listProducts") return await listProducts();
    if (action === "checkPlayerId") return await checkPlayerId(body);
    if (action === "placeOrder") return await placeOrder(body);
    return json({ success: false, message: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("[g2bulk-api] error:", err.message);
    return json({ success: false, message: err.message || "Internal error" }, 500);
  }
});
