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
        message: `သင်ထည့်ထားသောငွေ ${formattedAmount} ကျပ် ဖြည့်သွင်းပြီးပါပြီ။ YK Game Shop ကိုအသုံးပြုသည့်အတွက်ကျေးဇူးတင်ပါတယ်။`,
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

    if (action === "get_products_with_items") {
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      const { data: items } = await supabaseAdmin
        .from("product_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      return new Response(JSON.stringify({ products: products || [], items: items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_item_price") {
      const itemId = params.item_id;
      const newPrice = params.new_price;
      if (!itemId || typeof newPrice !== "number" || newPrice < 0) {
        throw new Error("Invalid item_id or new_price");
      }

      const { error } = await supabaseAdmin
        .from("product_items")
        .update({ price: newPrice })
        .eq("id", itemId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_profit_margins") {
      const { data, error } = await supabaseAdmin
        .from("profit_margins")
        .select("*")
        .order("scope", { ascending: true })
        .order("game_code", { ascending: true, nullsFirst: true })
        .order("catalogue_name", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return new Response(JSON.stringify({ margins: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upsert_profit_margin") {
      const MarginSchema = z.object({
        scope: z.enum(["global", "game", "package"]),
        game_code: z.string().trim().min(1).max(64).nullable().optional(),
        catalogue_name: z.string().trim().min(1).max(128).nullable().optional(),
        margin_percent: z.number().min(0).max(1000),
      });
      const parsed = MarginSchema.parse(params);
      const row: any = {
        scope: parsed.scope,
        game_code: parsed.scope === "global" ? null : (parsed.game_code || null),
        catalogue_name: parsed.scope === "package" ? (parsed.catalogue_name || null) : null,
        margin_percent: parsed.margin_percent,
      };
      if (parsed.scope === "game" && !row.game_code) throw new Error("game_code required for game scope");
      if (parsed.scope === "package" && (!row.game_code || !row.catalogue_name))
        throw new Error("game_code and catalogue_name required for package scope");

      // Manual upsert respecting unique partial indexes
      let existingId: string | null = null;
      if (parsed.scope === "global") {
        const { data } = await supabaseAdmin.from("profit_margins").select("id").eq("scope", "global").maybeSingle();
        existingId = data?.id || null;
      } else if (parsed.scope === "game") {
        const { data } = await supabaseAdmin.from("profit_margins").select("id")
          .eq("scope", "game").eq("game_code", row.game_code).maybeSingle();
        existingId = data?.id || null;
      } else {
        const { data } = await supabaseAdmin.from("profit_margins").select("id")
          .eq("scope", "package").eq("game_code", row.game_code).eq("catalogue_name", row.catalogue_name).maybeSingle();
        existingId = data?.id || null;
      }

      if (existingId) {
        const { error } = await supabaseAdmin.from("profit_margins").update({ margin_percent: row.margin_percent }).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("profit_margins").insert(row);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_profit_margin") {
      const id = params.id;
      if (!id || typeof id !== "string") throw new Error("Invalid id");
      const { error } = await supabaseAdmin.from("profit_margins").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
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
