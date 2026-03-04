import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schemas
const DepositActionSchema = z.object({
  deposit_id: z.string().uuid(),
});

const TransferSchema = z.object({
  user_code: z.string().regex(/^GT\d{6}$/, "Invalid user code format").refine(val => val.length === 8, "Invalid user code length"),
  amount: z.number().int("Amount must be a whole number").min(100, "Minimum transfer is 100 kyats").max(10000000, "Amount too large"),
});

const ActionSchema = z.object({
  action: z.string(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Not an admin");

    const body = await req.json();
    const { action } = ActionSchema.parse(body);
    const params = body;

    if (action === "approve_deposit") {
      const { deposit_id } = DepositActionSchema.parse(params);
      const { data: deposit } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("id", deposit_id)
        .single();
      if (!deposit) throw new Error("Deposit not found");
      if (deposit.status !== "processing") throw new Error("Deposit already processed");

      await supabaseAdmin
        .from("deposits")
        .update({ status: "success" })
        .eq("id", deposit_id);

      await supabaseAdmin.rpc('increment_wallet_balance', {
        p_user_id: deposit.user_id,
        p_amount: deposit.amount,
      });

      const formattedAmount = new Intl.NumberFormat('my-MM').format(deposit.amount);
      await supabaseAdmin.from("notifications").insert({
        user_id: deposit.user_id,
        message: `သင်ထည့်ထားသောငွေ ${formattedAmount} ကျပ် ဖြည့်သွင်းပြီးပါပြီ။ SHADOW GAME SHOP ကိုအသုံးပြုသည့်အတွက်ကျေးဇူးတင်ပါတယ်။`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject_deposit") {
      const { deposit_id } = DepositActionSchema.parse(params);
      const { data: deposit } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("id", deposit_id)
        .single();
      if (!deposit) throw new Error("Deposit not found");
      if (deposit.status !== "processing") throw new Error("Deposit already processed");

      await supabaseAdmin
        .from("deposits")
        .update({ status: "failed" })
        .eq("id", deposit_id);

      const formattedAmount = new Intl.NumberFormat('my-MM').format(deposit.amount);
      await supabaseAdmin.from("notifications").insert({
        user_id: deposit.user_id,
        message: `သင်ဖြည့်သွင်းထားသောငွေ ${formattedAmount} ကျပ်အား Admin မှငြင်းပယ်လိုက်ပါသည်။ ငွေလွှဲအမှားကြောင့် ငြင်းပယ်တယ်ဆိုလျှင် သင့် acc အား ban ခံရပါမည်။`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "transfer") {
      const { user_code, amount } = TransferSchema.parse(params);
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_code", user_code)
        .single();
      if (!profile) throw new Error("User not found");

      await supabaseAdmin.rpc('increment_wallet_balance', {
        p_user_id: profile.user_id,
        p_amount: amount,
      });

      return new Response(JSON.stringify({ success: true, user_name: profile.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_stats") {
      const { count: userCount } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: successCount } = await supabaseAdmin
        .from("deposits")
        .select("*", { count: "exact", head: true })
        .eq("status", "success");

      const { data: totalData } = await supabaseAdmin
        .from("deposits")
        .select("amount")
        .eq("status", "success");

      const totalAmount = totalData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      return new Response(JSON.stringify({ userCount, successCount, totalAmount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_pending_deposits") {
      const { data: depositsData } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("status", "processing")
        .order("created_at", { ascending: false });

      const userIds = [...new Set((depositsData || []).map(d => d.user_id))];
      const { data: profilesData } = await supabaseAdmin
        .from("profiles")
        .select("user_id, name, user_code, phone")
        .in("user_id", userIds.length > 0 ? userIds : ['none']);

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

      // Generate signed URLs for screenshots
      const deposits = await Promise.all((depositsData || []).map(async (d) => {
        let signedUrl = d.screenshot_url;
        if (d.screenshot_url) {
          // The stored value is either a full URL containing '/screenshots/' or just the path
          const path = d.screenshot_url.includes('/screenshots/')
            ? d.screenshot_url.split('/screenshots/')[1]
            : d.screenshot_url;
          if (path) {
            const { data: urlData } = await supabaseAdmin.storage
              .from('screenshots')
              .createSignedUrl(path, 3600);
            if (urlData?.signedUrl) signedUrl = urlData.signedUrl;
          }
        }
        return {
          ...d,
          screenshot_url: signedUrl,
          profiles: profileMap.get(d.user_id) || null,
        };
      }));

      return new Response(JSON.stringify({ deposits }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_order_history") {
      const { data: depositsData } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .in("status", ["success", "failed"])
        .order("updated_at", { ascending: false });

      const userIds = [...new Set((depositsData || []).map(d => d.user_id))];
      const { data: profilesData } = await supabaseAdmin
        .from("profiles")
        .select("user_id, name, user_code, phone")
        .in("user_id", userIds.length > 0 ? userIds : ['none']);

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

      // Generate signed URLs for screenshots
      const orders = await Promise.all((depositsData || []).map(async (d) => {
        let signedUrl = d.screenshot_url;
        if (d.screenshot_url) {
          const path = d.screenshot_url.includes('/screenshots/')
            ? d.screenshot_url.split('/screenshots/')[1]
            : d.screenshot_url;
          if (path) {
            const { data: urlData } = await supabaseAdmin.storage
              .from('screenshots')
              .createSignedUrl(path, 3600);
            if (urlData?.signedUrl) signedUrl = urlData.signedUrl;
          }
        }
        return {
          ...d,
          screenshot_url: signedUrl,
          profiles: profileMap.get(d.user_id) || null,
        };
      }));

      return new Response(JSON.stringify({ orders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_all_users") {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ users: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_pending_game_orders") {
      const { data: ordersData } = await supabaseAdmin
        .from("game_orders")
        .select("*")
        .eq("status", "processing")
        .order("created_at", { ascending: false });

      const userIds = [...new Set((ordersData || []).map(o => o.user_id))];
      const { data: profilesData } = await supabaseAdmin
        .from("profiles")
        .select("user_id, name, user_code, phone")
        .in("user_id", userIds.length > 0 ? userIds : ['none']);

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      const orders = (ordersData || []).map(o => ({
        ...o,
        profiles: profileMap.get(o.user_id) || null,
      }));

      return new Response(JSON.stringify({ orders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve_game_order") {
      const { deposit_id } = DepositActionSchema.parse(params);
      const { data: order } = await supabaseAdmin
        .from("game_orders")
        .select("*")
        .eq("id", deposit_id)
        .single();
      if (!order) throw new Error("Order not found");
      if (order.status !== "processing") throw new Error("Order already processed");

      await supabaseAdmin
        .from("game_orders")
        .update({ status: "success" })
        .eq("id", deposit_id);

      const formattedAmount = new Intl.NumberFormat('my-MM').format(order.price);
      await supabaseAdmin.from("notifications").insert({
        user_id: order.user_id,
        message: `သင်မှာယူထားသော ${order.item_name} (${order.product_name}) ${formattedAmount} ကျပ် အော်ဒါအား အတည်ပြုပြီးပါပြီ။`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject_game_order") {
      const { deposit_id } = DepositActionSchema.parse(params);
      const { data: order } = await supabaseAdmin
        .from("game_orders")
        .select("*")
        .eq("id", deposit_id)
        .single();
      if (!order) throw new Error("Order not found");
      if (order.status !== "processing") throw new Error("Order already processed");

      await supabaseAdmin
        .from("game_orders")
        .update({ status: "failed" })
        .eq("id", deposit_id);

      // Refund wallet balance
      await supabaseAdmin.rpc('increment_wallet_balance', {
        p_user_id: order.user_id,
        p_amount: order.price,
      });

      const formattedAmount = new Intl.NumberFormat('my-MM').format(order.price);
      await supabaseAdmin.from("notifications").insert({
        user_id: order.user_id,
        message: `သင်မှာယူထားသော ${order.item_name} (${order.product_name}) ${formattedAmount} ကျပ် အော်ဒါအား ငြင်းပယ်လိုက်ပါသည်။ ငွေပြန်အမ်းပြီးပါပြီ။`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_game_order_history") {
      const { data: ordersData } = await supabaseAdmin
        .from("game_orders")
        .select("*")
        .in("status", ["success", "failed"])
        .order("updated_at", { ascending: false });

      const userIds = [...new Set((ordersData || []).map(o => o.user_id))];
      const { data: profilesData } = await supabaseAdmin
        .from("profiles")
        .select("user_id, name, user_code, phone")
        .in("user_id", userIds.length > 0 ? userIds : ['none']);

      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      const orders = (ordersData || []).map(o => ({
        ...o,
        profiles: profileMap.get(o.user_id) || null,
      }));

      return new Response(JSON.stringify({ orders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_admin") {
      return new Response(JSON.stringify({ isAdmin: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error) {
    console.error('[Admin Action Error]', error instanceof Error ? error.message : error);
    
    let status = 400;
    let clientMessage = "Operation failed";
    
    if (error instanceof z.ZodError) {
      clientMessage = "Invalid request parameters";
    } else if (error instanceof Error) {
      if (error.message === "Unauthorized" || error.message === "Not an admin") {
        status = 403;
        clientMessage = "Access denied";
      } else if (error.message === "Unknown action") {
        clientMessage = "Invalid request";
      }
      // All other errors get generic "Operation failed"
    }
    
    return new Response(JSON.stringify({ error: clientMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
