import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { action, ...params } = await req.json();

    if (action === "approve_deposit") {
      const { deposit_id } = params;
      const { data: deposit } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("id", deposit_id)
        .single();
      if (!deposit) throw new Error("Deposit not found");

      await supabaseAdmin
        .from("deposits")
        .update({ status: "success" })
        .eq("id", deposit_id);

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("wallet_balance")
        .eq("user_id", deposit.user_id)
        .single();

      await supabaseAdmin
        .from("profiles")
        .update({ wallet_balance: (profile?.wallet_balance || 0) + deposit.amount })
        .eq("user_id", deposit.user_id);

      // Send notification to user
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
      const { deposit_id } = params;
      // Get deposit for amount and user_id
      const { data: deposit } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("id", deposit_id)
        .single();
      if (!deposit) throw new Error("Deposit not found");

      await supabaseAdmin
        .from("deposits")
        .update({ status: "failed" })
        .eq("id", deposit_id);

      // Send notification to user
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
      const { user_code, amount } = params;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_code", user_code)
        .single();
      if (!profile) throw new Error("User not found");

      await supabaseAdmin
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance + amount })
        .eq("user_code", user_code);

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
      const deposits = (depositsData || []).map(d => ({
        ...d,
        profiles: profileMap.get(d.user_id) || null,
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
      const orders = (depositsData || []).map(d => ({
        ...d,
        profiles: profileMap.get(d.user_id) || null,
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

    throw new Error("Unknown action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
