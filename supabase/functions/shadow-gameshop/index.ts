// Shadow Game Shop API proxy
// Wraps the live get-products / g2bulk-proxy endpoints with the reseller key
// stored as a server-side secret. Applies admin-controlled profit margins
// hierarchically (package > game > global) to the API base price.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ORDER_URL =
  Deno.env.get("SHADOW_GAMESHOP_API_URL") ||
  "https://vipszqowclbnygagevvv.supabase.co/functions/v1/g2bulk-proxy";
const PRODUCTS_URL = ORDER_URL.replace(/\/g2bulk-proxy$/, "/get-products");
const API_KEY = Deno.env.get("SHADOW_GAMESHOP_API_KEY") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    console.error("[shadow-gameshop] load margins error:", error.message);
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

function applyMargins(payload: any, margins: Awaited<ReturnType<typeof loadMargins>>) {
  if (!payload || !Array.isArray(payload.games)) return payload;
  for (const g of payload.games) {
    const gameCode = g.game_code;
    if (!Array.isArray(g.packages)) continue;
    for (const p of g.packages) {
      const basePriceMmk = Number(p.price_mmk) || 0;
      if (basePriceMmk <= 0) continue;
      const pct = pickMargin(margins, gameCode, p.catalogue_name);
      const finalMmk = Math.round(basePriceMmk * (1 + pct / 100));
      p.api_price_mmk = basePriceMmk; // expose for admin UI
      p.margin_percent = pct;
      p.price_mmk = finalMmk;
      p.reseller_price_mmk = finalMmk; // remove the 2% reseller bump
    }
  }
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!API_KEY) {
    return json({ success: false, message: "SHADOW_GAMESHOP_API_KEY not configured" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (!action) return json({ success: false, message: "Missing action" }, 400);

    if (action === "listProducts") {
      const res = await fetch(PRODUCTS_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      console.log("[shadow-gameshop] listProducts status:", res.status);

      if (res.ok && data?.success) {
        const margins = await loadMargins();
        data = applyMargins(data, margins);
      }
      return json(data, res.ok ? 200 : res.status);
    }

    // Helper: call upstream g2bulk-proxy with given body
    async function callUpstream(payload: Record<string, unknown>) {
      const res = await fetch(ORDER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      return { res, data, text };
    }

    if (action === "checkPlayerId") {
      const { res, data } = await callUpstream(body);
      console.log(`[shadow-gameshop] checkPlayerId status:`, res.status);
      return json(data, res.ok ? 200 : res.status);
    }

    if (action === "placeOrder") {
      // Order request is sent to Shadow Game Shop using the reseller API key
      // (configured server-side via SHADOW_GAMESHOP_API_KEY). Shadow Game Shop
      // deducts the reseller-tier USD price directly from the reseller account
      // balance. If the reseller account has insufficient balance, the upstream
      // call fails and we surface a clear error so the user's wallet is NOT
      // deducted on the YK side.
      const priceUsd = Number((body as any)?.price_usd);
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
        return json({ success: false, message: "Invalid price_usd" }, 400);
      }

      const { res, data, text } = await callUpstream(body);
      console.log(`[shadow-gameshop] placeOrder status:`, res.status, "resp:", text.slice(0, 300));

      // Detect "insufficient reseller balance" errors from upstream and surface
      // a friendlier message. Different upstream versions phrase this slightly
      // differently, so match a few common patterns.
      const msg: string = (data?.message || data?.error || "").toString().toLowerCase();
      const insufficient =
        msg.includes("insufficient") ||
        msg.includes("not enough") ||
        msg.includes("balance") && (msg.includes("low") || msg.includes("short"));
      if (!data?.success && insufficient) {
        return json({
          success: false,
          insufficient_reseller_balance: true,
          message:
            "Reseller account balance on Shadow Game Shop is insufficient for this order. Please top up the reseller account before retrying.",
          upstream: data,
        }, 402);
      }

      return json(data, res.ok ? 200 : res.status);
    }

    return json({ success: false, message: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("[shadow-gameshop] error:", err.message);
    return json({ success: false, message: err.message || "Internal error" }, 500);
  }
});
