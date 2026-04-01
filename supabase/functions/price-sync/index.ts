import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BotConfig {
  name: string;
  actorId: string;
  tokenEnv: string;
  index: number;
}

const BOTS: BotConfig[] = [
  { name: "quarterly_raccoon/my-actor-4", actorId: "quarterly_raccoon~my-actor-4", tokenEnv: "APIFY_BOT1_TOKEN", index: 1 },
  { name: "diplomatic_girl/y-gyi-bot-1", actorId: "diplomatic_girl~y-gyi-bot-1", tokenEnv: "APIFY_BOT2_TOKEN", index: 2 },
  { name: "cunning_fad/y-gyi-bot-2", actorId: "cunning_fad~y-gyi-bot-2", tokenEnv: "APIFY_BOT3_TOKEN", index: 3 },
  { name: "slim_niagara/y-gyi-bot-3", actorId: "slim_niagara~y-gyi-bot-3", tokenEnv: "APIFY_BOT4_TOKEN", index: 4 },
];

const PROFIT_MARGIN = 1.05; // 5% markup
const INACTIVE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Track inactive bots in-memory (resets on cold start)
const inactiveBots: Record<number, number> = {};

function isBotActive(botIndex: number): boolean {
  const inactiveUntil = inactiveBots[botIndex];
  if (!inactiveUntil) return true;
  if (Date.now() > inactiveUntil) {
    delete inactiveBots[botIndex];
    return true;
  }
  return false;
}

function markBotInactive(botIndex: number) {
  inactiveBots[botIndex] = Date.now() + INACTIVE_TIMEOUT_MS;
}

async function runBot(bot: BotConfig, supabaseAdmin: any): Promise<{ success: boolean; items: any[]; error?: string }> {
  const token = Deno.env.get(bot.tokenEnv);
  if (!token) {
    return { success: false, items: [], error: `Token not configured: ${bot.tokenEnv}` };
  }

  // Log bot run start
  const { data: runLog } = await supabaseAdmin
    .from("bot_runs")
    .insert({ bot_name: bot.name, bot_index: bot.index, status: "running" })
    .select("id")
    .single();

  try {
    // Start the Apify actor run
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/${bot.actorId}/runs?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeout: 30 }),
      }
    );

    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Failed to start actor: ${startRes.status} - ${errText}`);
    }

    const runData = await startRes.json();
    const runId = runData.data?.id;
    if (!runId) throw new Error("No run ID returned");

    // Poll for completion (max 60s)
    let status = "RUNNING";
    let attempts = 0;
    while (status === "RUNNING" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
      );
      const statusData = await statusRes.json();
      status = statusData.data?.status || "FAILED";
      attempts++;
    }

    if (status !== "SUCCEEDED") {
      throw new Error(`Actor run failed with status: ${status}`);
    }

    // Get dataset items
    const datasetId = runData.data?.defaultDatasetId;
    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`
    );
    const items = await itemsRes.json();

    // Update bot run log
    if (runLog?.id) {
      await supabaseAdmin
        .from("bot_runs")
        .update({ status: "success", completed_at: new Date().toISOString(), items_updated: items.length })
        .eq("id", runLog.id);
    }

    return { success: true, items };
  } catch (err: any) {
    // Update bot run log with error
    if (runLog?.id) {
      await supabaseAdmin
        .from("bot_runs")
        .update({ status: "failed", completed_at: new Date().toISOString(), error_message: err.message })
        .eq("id", runLog.id);
    }
    return { success: false, items: [], error: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try bots with failover
    let result: { success: boolean; items: any[]; error?: string } = { success: false, items: [] };
    let usedBot: BotConfig | null = null;

    for (const bot of BOTS) {
      if (!isBotActive(bot.index)) {
        console.log(`Bot ${bot.name} is inactive, skipping...`);
        continue;
      }

      console.log(`Trying bot: ${bot.name}`);
      result = await runBot(bot, supabaseAdmin);

      if (result.success) {
        usedBot = bot;
        break;
      } else {
        console.error(`Bot ${bot.name} failed: ${result.error}`);
        markBotInactive(bot.index);
      }
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "All bots failed",
          details: result.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update product prices with 5% margin
    let updatedCount = 0;
    for (const item of result.items) {
      const providerPrice = item.price || item.original_price || 0;
      if (providerPrice <= 0) continue;

      const sellingPrice = Math.ceil(providerPrice * PROFIT_MARGIN);
      const itemName = item.name || item.item_name || "";

      if (!itemName) continue;

      // Try to match by name
      const { data: existingItems } = await supabaseAdmin
        .from("product_items")
        .select("id")
        .ilike("name", `%${itemName}%`);

      if (existingItems && existingItems.length > 0) {
        for (const existing of existingItems) {
          await supabaseAdmin
            .from("product_items")
            .update({
              provider_price: providerPrice,
              price: sellingPrice,
            })
            .eq("id", existing.id);
          updatedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bot_used: usedBot?.name,
        items_scraped: result.items.length,
        items_updated: updatedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Price sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
