import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public webhook — Telegram cannot send JWT.
// Security: Telegram secret token header validation.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

const ADMIN_HANDLE = "Shadow137200";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    if (!TELEGRAM_BOT_TOKEN) throw new Error("Bot token missing");

    if (SECRET) {
      const got = req.headers.get("x-telegram-bot-api-secret-token");
      if (got !== SECRET) {
        return new Response("forbidden", { status: 403 });
      }
    }

    const update = await req.json();
    const cb = update.callback_query;
    if (!cb) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: string = cb.data || "";
    const [action, depositId] = data.split(":");
    const messageId = cb.message?.message_id;
    const chatId = cb.message?.chat?.id;
    const originalCaption: string = cb.message?.caption || "";
    const actorUsername: string = cb.from?.username || cb.from?.first_name || "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Always answer callback to remove loading state
    const answerCb = async (text: string, showAlert = false) => {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text, show_alert: showAlert }),
      });
    };

    const editCaption = async (newCaption: string) => {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageCaption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: newCaption,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        }),
      });
    };

    if (!depositId || (action !== "approve" && action !== "reject")) {
      await answerCb("Invalid action");
      return new Response("ok");
    }

    // Fetch deposit
    const { data: deposit, error: depErr } = await supabaseAdmin
      .from("deposits")
      .select("*")
      .eq("id", depositId)
      .single();

    if (depErr || !deposit) {
      await answerCb("Deposit not found", true);
      return new Response("ok");
    }

    if (deposit.status !== "processing") {
      await answerCb(`Already ${deposit.status}`, true);
      await editCaption(`${originalCaption}\n\n⚠️ Already processed (${deposit.status})`);
      return new Response("ok");
    }

    if (action === "approve") {
      await supabaseAdmin.from("deposits").update({ status: "success" }).eq("id", depositId);
      await supabaseAdmin.rpc("increment_wallet_balance", {
        p_user_id: deposit.user_id,
        p_amount: Number(deposit.amount),
      });

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("wallet_balance, name")
        .eq("user_id", deposit.user_id)
        .single();

      const newBalance = new Intl.NumberFormat("my-MM").format(
        Number(profile?.wallet_balance || 0),
      );
      const formattedAmt = new Intl.NumberFormat("my-MM").format(Number(deposit.amount));

      await supabaseAdmin.from("notifications").insert({
        user_id: deposit.user_id,
        message: `သင်ထည့်ထားသောငွေ ${formattedAmt} ကျပ် ဖြည့်သွင်းပြီးပါပြီ။ YK Game Shop ကိုအသုံးပြုသည့်အတွက်ကျေးဇူးတင်ပါတယ်။`,
      });

      await editCaption(
        `${originalCaption}\n\n✅ <b>APPROVED</b> by @${escapeHtml(ADMIN_HANDLE)} | New balance: <b>${newBalance} ကျပ်</b>`,
      );
      await answerCb("Approved ✅");
    } else {
      await supabaseAdmin.from("deposits").update({ status: "failed" }).eq("id", depositId);

      const formattedAmt = new Intl.NumberFormat("my-MM").format(Number(deposit.amount));
      await supabaseAdmin.from("notifications").insert({
        user_id: deposit.user_id,
        message: `သင်ဖြည့်သွင်းထားသောငွေ ${formattedAmt} ကျပ်အား Admin မှငြင်းပယ်လိုက်ပါသည်။`,
      });

      await editCaption(
        `${originalCaption}\n\n❌ <b>REJECTED</b> by @${escapeHtml(ADMIN_HANDLE)}`,
      );
      await answerCb("Rejected ❌");
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[telegram-webhook]", err);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
