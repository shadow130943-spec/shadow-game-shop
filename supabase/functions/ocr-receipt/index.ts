import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const mode: "transaction_id" | "amount" = body.mode === "amount" ? "amount" : "transaction_id";
    const { screenshot_path, image_base64, mime_type } = body ?? {};

    // Transaction-ID extraction stays admin-only. Amount extraction is available
    // to any signed-in user for their own upload.
    if (mode === "transaction_id") {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (!roleData || roleData.length === 0) {
        return json({ error: "Admin access required" }, 403);
      }
    }

    let dataUrl: string;

    if (image_base64) {
      if (typeof image_base64 !== "string" || image_base64.length > 12_000_000) {
        return json({ error: "Invalid image data" }, 400);
      }
      const mt = typeof mime_type === "string" && mime_type.startsWith("image/") ? mime_type : "image/jpeg";
      dataUrl = image_base64.startsWith("data:") ? image_base64 : `data:${mt};base64,${image_base64}`;
    } else if (screenshot_path) {
      if (mode === "amount" && !String(screenshot_path).startsWith(`${user.id}/`)) {
        return json({ error: "Forbidden" }, 403);
      }
      const { data: signedData, error: signedError } = await supabaseAdmin
        .storage
        .from("screenshots")
        .createSignedUrl(screenshot_path, 300);
      if (signedError || !signedData?.signedUrl) {
        return json({ error: "Failed to access screenshot" }, 400);
      }
      const imgRes = await fetch(signedData.signedUrl);
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const mt = imgRes.headers.get("content-type") || "image/jpeg";
      dataUrl = `data:${mt};base64,${btoa(binary)}`;
    } else {
      return json({ error: "screenshot_path or image_base64 required" }, 400);
    }

    const prompt = mode === "amount"
      ? "This is a mobile payment receipt screenshot (Wave Pay / KBZ Pay / other Myanmar mobile wallets). Find the transferred payment amount in Myanmar Kyat. Return ONLY the number with no currency symbol, no commas and no decimals (e.g. 10000). If you cannot confidently find the amount, return NOT_FOUND."
      : "This is a mobile payment receipt screenshot (Wave Pay or KBZ Pay). Extract the Transaction ID / Reference Number from this image. Return ONLY the transaction ID string, nothing else. If you cannot find a transaction ID, return 'NOT_FOUND'.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[ocr-receipt] AI error:", aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: "Too many requests, please try again shortly" }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: "OCR processing failed" }, 500);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content?.trim() || "NOT_FOUND";

    if (mode === "amount") {
      const digits = raw.replace(/[^0-9]/g, "");
      const amount = digits ? parseInt(digits, 10) : 0;
      if (!amount || amount < 100 || amount > 10_000_000) {
        return json({ amount: null, raw });
      }
      return json({ amount, raw });
    }

    return json({ transaction_id: raw });
  } catch (err: any) {
    console.error("[ocr-receipt] Error:", err.message);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
