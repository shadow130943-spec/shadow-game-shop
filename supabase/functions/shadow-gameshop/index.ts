// Shadow Game Shop API proxy
// Wraps the live get-products / g2bulk-proxy endpoints with the reseller key
// stored as a server-side secret.

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

    // Live catalog — no body required by upstream
    if (action === "listProducts") {
      const res = await fetch(PRODUCTS_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      console.log("[shadow-gameshop] listProducts status:", res.status);
      return json(data, res.ok ? 200 : res.status);
    }

    if (action === "checkPlayerId" || action === "placeOrder") {
      const upstreamBody = { ...body };
      const res = await fetch(ORDER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(upstreamBody),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      console.log(`[shadow-gameshop] ${action} status:`, res.status, "resp:", text.slice(0, 300));
      return json(data, res.ok ? 200 : res.status);
    }

    return json({ success: false, message: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("[shadow-gameshop] error:", err.message);
    return json({ success: false, message: err.message || "Internal error" }, 500);
  }
});
