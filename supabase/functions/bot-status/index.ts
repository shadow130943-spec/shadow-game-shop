import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Get bot run history (last 20)
    const { data: botRuns } = await supabaseAdmin
      .from("bot_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // Get bot health summary
    const botNames = [
      "quarterly_raccoon/my-actor-4",
      "diplomatic_girl/y-gyi-bot-1",
      "cunning_fad/y-gyi-bot-2",
      "slim_niagara/y-gyi-bot-3",
    ];

    const botHealth = await Promise.all(
      botNames.map(async (name, idx) => {
        const { data: lastRun } = await supabaseAdmin
          .from("bot_runs")
          .select("*")
          .eq("bot_name", name)
          .order("created_at", { ascending: false })
          .limit(1);

        const { count: errorCount } = await supabaseAdmin
          .from("bot_runs")
          .select("id", { count: "exact", head: true })
          .eq("bot_name", name)
          .eq("status", "failed");

        return {
          name,
          bot_index: idx + 1,
          last_run: lastRun?.[0] || null,
          error_count: errorCount || 0,
          is_healthy: lastRun?.[0]?.status !== "failed",
        };
      })
    );

    return new Response(
      JSON.stringify({ bot_runs: botRuns || [], bot_health: botHealth }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[bot-status] error:", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
