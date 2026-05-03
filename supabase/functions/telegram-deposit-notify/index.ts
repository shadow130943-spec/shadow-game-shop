import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      throw new Error("Telegram credentials not configured");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } =
      await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { deposit_id } = await req.json();
    if (!deposit_id || typeof deposit_id !== "string") {
      throw new Error("deposit_id required");
    }

    // Fetch deposit (must belong to caller)
    const { data: deposit, error: depErr } = await supabaseAdmin
      .from("deposits")
      .select("*")
      .eq("id", deposit_id)
      .eq("user_id", user.id)
      .single();
    if (depErr || !deposit) throw new Error("Deposit not found");

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, phone, user_code")
      .eq("user_id", user.id)
      .single();

    // Generate signed URL for screenshot
    const path = deposit.screenshot_url.includes("/screenshots/")
      ? deposit.screenshot_url.split("/screenshots/")[1]
      : deposit.screenshot_url;

    const { data: signed } = await supabaseAdmin.storage
      .from("screenshots")
      .createSignedUrl(path, 60 * 60 * 24); // 24h

    const photoUrl = signed?.signedUrl;
    if (!photoUrl) throw new Error("Could not generate screenshot URL");

    const formattedAmount = new Intl.NumberFormat("my-MM").format(
      Number(deposit.amount),
    );

    const caption =
      `💰 <b>New Deposit Request</b>\n\n` +
      `👤 <b>Name:</b> ${escapeHtml(profile?.name || "—")}\n` +
      `📞 <b>Phone:</b> ${escapeHtml(profile?.phone || "—")}\n` +
      `🆔 <b>User ID:</b> ${escapeHtml(profile?.user_code || "—")}\n` +
      `💵 <b>Amount:</b> ${formattedAmount} ကျပ်\n` +
      `🧾 <b>Deposit ID:</b> <code>${deposit.id}</code>`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_ADMIN_CHAT_ID,
          photo: photoUrl,
          caption,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "Approve ✅", callback_data: `approve:${deposit.id}` },
              { text: "Reject ❌", callback_data: `reject:${deposit.id}` },
            ]],
          },
        }),
      },
    );

    const tgJson = await tgRes.json();
    if (!tgJson.ok) {
      console.error("Telegram sendPhoto failed:", tgJson);
      throw new Error("Failed to send Telegram notification");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[telegram-deposit-notify]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
