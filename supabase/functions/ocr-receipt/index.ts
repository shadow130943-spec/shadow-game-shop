import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify user is admin
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

    const { screenshot_path } = await req.json();
    if (!screenshot_path) {
      return new Response(JSON.stringify({ error: "screenshot_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get signed URL for the screenshot
    const { data: signedData, error: signedError } = await supabaseAdmin
      .storage
      .from("screenshots")
      .createSignedUrl(screenshot_path, 300);

    if (signedError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to access screenshot" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the image and convert to base64
    const imgRes = await fetch(signedData.signedUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const base64Img = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

    // Use Lovable AI (Gemini) for OCR
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
              {
                type: "text",
                text: "This is a mobile payment receipt screenshot (Wave Pay or KBZ Pay). Extract the Transaction ID / Reference Number from this image. Return ONLY the transaction ID string, nothing else. If you cannot find a transaction ID, return 'NOT_FOUND'."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Img}`
                }
              }
            ]
          }
        ],
        max_tokens: 100,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[ocr-receipt] AI error:", errText);
      return new Response(JSON.stringify({ error: "OCR processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const transactionId = aiData.choices?.[0]?.message?.content?.trim() || "NOT_FOUND";

    return new Response(
      JSON.stringify({ transaction_id: transactionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[ocr-receipt] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
