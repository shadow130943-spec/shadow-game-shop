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
      ? `You are an OCR engine for Myanmar mobile payment receipts (KBZPay, WavePay, AYA Pay, CB Pay, KBZ Bank, AYA Bank, Yoma, UAB, Telegram/other wallets).
Read ALL text in the screenshot and identify the transferred / paid amount in Myanmar Kyat (MMK / Ks / ကျပ်).
Rules:
- Pick the main transfer amount, NOT the remaining balance, NOT fees, NOT dates, NOT phone numbers, NOT transaction IDs.
- Amounts may be written like "10,000.00 Ks", "- 5000 MMK", "၁၀,၀၀၀" (Myanmar digits). Convert Myanmar digits to Arabic digits.
- Drop thousands separators and the ".00" decimals; return a whole number.
Respond with ONLY a compact JSON object, no markdown:
{"amount": <integer or null>, "confidence": <0-1 number>, "text": "<the exact amount text you saw>"}
Use null and confidence 0 if you cannot read the amount reliably.`
      : "This is a mobile payment receipt screenshot (Wave Pay or KBZ Pay). Extract the Transaction ID / Reference Number from this image. Return ONLY the transaction ID string, nothing else. If you cannot find a transaction ID, return 'NOT_FOUND'.";

    const callModel = async (model: string) =>
      await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 300,
        }),
      });

    const parseAmount = (raw: string): { amount: number | null; confidence: number; text: string } => {
      let amount: number | null = null;
      let confidence = 0;
      let text = raw;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const obj = JSON.parse(jsonMatch[0]);
          if (obj.amount !== null && obj.amount !== undefined) {
            const n = Math.round(Number(String(obj.amount).replace(/[^0-9.]/g, "")));
            if (Number.isFinite(n) && n > 0) amount = n;
          }
          confidence = Number(obj.confidence) || (amount ? 0.6 : 0);
          text = String(obj.text ?? raw);
        } catch { /* fall through */ }
      }
      if (amount === null) {
        // Fallback: first plausible number in the raw text
        const m = raw.replace(/[^\d,.\s]/g, " ").match(/\d[\d,]*(?:\.\d+)?/);
        if (m) {
          const n = Math.round(Number(m[0].replace(/,/g, "")));
          if (Number.isFinite(n) && n > 0) {
            amount = n;
            confidence = Math.max(confidence, 0.4);
          }
        }
      }
      if (amount !== null && (amount < 1 || amount > 10_000_000)) amount = null;
      return { amount, confidence, text };
    };

    // Primary model, then a stronger fallback if the first cannot read the amount.
    const models = mode === "amount"
      ? ["google/gemini-3.7-flash", "google/gemini-3.1-pro-preview"]
      : ["google/gemini-3.7-flash"];

    let lastRaw = "";
    for (let i = 0; i < models.length; i++) {
      const aiRes = await callModel(models[i]);

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("[ocr-receipt] AI error:", models[i], aiRes.status, errText);
        if (aiRes.status === 429) return json({ error: "Too many requests, please try again shortly" }, 429);
        if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
        if (i === models.length - 1) return json({ error: "OCR processing failed" }, 500);
        continue;
      }

      const aiData = await aiRes.json();
      lastRaw = aiData.choices?.[0]?.message?.content?.trim() || "";

      if (mode !== "amount") {
        return json({ transaction_id: lastRaw || "NOT_FOUND" });
      }

      const { amount, confidence, text } = parseAmount(lastRaw);
      if (amount !== null) return json({ amount, confidence, text, raw: lastRaw });
    }

    return json({ amount: null, confidence: 0, raw: lastRaw });

  } catch (err: any) {
    console.error("[ocr-receipt] Error:", err.message);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
