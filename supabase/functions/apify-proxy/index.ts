import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTOR_ID = "quarterly_raccoon~akh-gameshop-actor";
const DEFAULT_PHONE = "09680072956";
const DEFAULT_PASSWORD = "130943";

async function runApifyActor(input: Record<string, unknown>): Promise<any> {
  const token = Deno.env.get("APIFY_ACTOR_TOKEN");
  if (!token) throw new Error("APIFY_ACTOR_TOKEN not configured");

  // Start the actor run
  const startUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}`;
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeout: 60,
      input,
    }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Failed to start actor: ${startRes.status} - ${errText}`);
  }

  const runData = await startRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  console.log(`[apify-proxy] Actor run started: ${runId}`);

  // Poll for completion (max 120s)
  let status = "RUNNING";
  let attempts = 0;
  while (status === "RUNNING" && attempts < 60) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    );
    const statusData = await statusRes.json();
    status = statusData.data?.status || "FAILED";
    attempts++;
    if (attempts % 5 === 0) console.log(`[apify-proxy] Poll #${attempts}: status=${status}`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Actor run ended with status: ${status}`);
  }

  // Fetch dataset items
  const datasetId = runData.data?.defaultDatasetId;
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`
  );
  const items = await itemsRes.json();
  console.log(`[apify-proxy] Got ${items.length} items from dataset`);

  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mode, userId, zoneId, packageName } = body;

    if (!mode || !userId) {
      return new Response(JSON.stringify({ success: false, message: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "check") {
      console.log(`[apify-proxy] Check mode: userId=${userId}, zoneId=${zoneId}`);
      const input = { mode: "check", userId, zoneId: zoneId || "" };
      const items = await runApifyActor(input);

      // Extract player name from actor response
      const result = items[0];
      if (result && result.playerName) {
        return new Response(JSON.stringify({ success: true, name: result.playerName }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (result && result.error) {
        return new Response(JSON.stringify({ success: false, message: result.error }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: "Player not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (mode === "buy") {
      if (!packageName) {
        return new Response(JSON.stringify({ success: false, message: "Missing packageName" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[apify-proxy] Buy mode: userId=${userId}, zoneId=${zoneId}, package=${packageName}`);
      const input = {
        mode: "buy",
        userId,
        zoneId: zoneId || "",
        packageName,
        phoneNumber: DEFAULT_PHONE,
        password: DEFAULT_PASSWORD,
      };
      const items = await runApifyActor(input);

      const result = items[0];
      if (result && result.success) {
        return new Response(JSON.stringify({ success: true, message: result.message || "Order submitted successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (result && result.error) {
        return new Response(JSON.stringify({ success: false, message: result.error }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: "Purchase failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ success: false, message: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: any) {
    console.error("[apify-proxy] Error:", err.message, err.stack);
    return new Response(JSON.stringify({ success: false, message: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
