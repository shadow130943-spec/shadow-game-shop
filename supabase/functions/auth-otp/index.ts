import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { buildCorsHeaders } from "../_shared/cors.ts";

const OTP_URL = "https://otpgiveaway.lovable.app/api/public/otp-manager";
const email = z.string().trim().toLowerCase().email().max(255);
const otp = z.string().regex(/^\d{6}$/);
const pw = z.string().min(6).max(72);

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), email }),
  z.object({ action: z.literal("signup"), email, password: pw, name: z.string().trim().min(1).max(60), otp_code: otp }),
  z.object({ action: z.literal("login"), email, password: z.string().min(1).max(72), otp_code: otp }),
  z.object({ action: z.literal("send_self") }),
  z.object({ action: z.literal("change_email"), new_email: email, otp_code: otp }),
  z.object({ action: z.literal("change_password"), old_password: z.string().min(1).max(72), new_password: pw, otp_code: otp }),
]);

async function callOtp(body: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(OTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Deno.env.get("OTP_API_KEY")! },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`[otp] network error action=${body.action}:`, e);
    return { ok: false, message: "network_error" };
  }
  const raw = await res.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { /* non-JSON body */ }
  const ok = res.ok && data?.success !== false && data?.valid !== false && data?.verified !== false && !data?.error;
  if (!ok) {
    console.error(`[otp] FAILED action=${body.action} status=${res.status} body=${raw.slice(0, 500)}`);
  } else {
    console.log(`[otp] OK action=${body.action} status=${res.status}`);
  }
  return { ok, message: data?.error || data?.message };
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }, 400);
    const p = parsed.data;
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anon = () => createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });

    if (p.action === "send") {
      const r = await callOtp({ action: "send", email: p.email });
      return r.ok ? json({ success: true }) : json({ error: "otp_send_failed", message: r.message }, 400);
    }

    if (p.action === "signup") {
      const v = await callOtp({ action: "verify", email: p.email, otp_code: p.otp_code });
      if (!v.ok) return json({ error: "otp_invalid" }, 400);
      const { error } = await admin.auth.admin.createUser({
        email: p.email, password: p.password, email_confirm: true,
        user_metadata: { name: p.name, phone: p.email },
      });
      if (error) return json({ error: /already|registered|exists/i.test(error.message) ? "email_taken" : "signup_failed" }, 400);
      const { data, error: e2 } = await anon().auth.signInWithPassword({ email: p.email, password: p.password });
      if (e2 || !data.session) return json({ success: true });
      return json({ success: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
    }

    if (p.action === "login") {
      // Check credentials first, then OTP; only return a session if both pass.
      const { data, error } = await anon().auth.signInWithPassword({ email: p.email, password: p.password });
      if (error || !data.session) return json({ error: "bad_credentials" }, 400);
      const v = await callOtp({ action: "verify", email: p.email, otp_code: p.otp_code });
      if (!v.ok) {
        await admin.auth.admin.signOut(data.session.access_token).catch(() => {});
        return json({ error: "otp_invalid" }, 400);
      }
      return json({ success: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
    }

    const sessionUser = async () => {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      if (!token) return null;
      const { data: { user } } = await admin.auth.getUser(token);
      return user?.email ? user : null;
    };

    if (p.action === "send_self") {
      const user = await sessionUser();
      if (!user) return json({ error: "unauthorized" }, 401);
      const r = await callOtp({ action: "send", email: user.email! });
      return r.ok ? json({ success: true }) : json({ error: "otp_send_failed" }, 400);
    }

    if (p.action === "change_email") {
      const user = await sessionUser();
      if (!user) return json({ error: "unauthorized" }, 401);
      if (p.new_email === user.email!.toLowerCase()) return json({ error: "email_same" }, 400);
      // OTP must have been sent to the CURRENT email (derived from the session, never the client).
      const v = await callOtp({ action: "verify", email: user.email!, otp_code: p.otp_code });
      if (!v.ok) return json({ error: "otp_invalid" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user.id, { email: p.new_email, email_confirm: true });
      if (error) return json({ error: /already|registered|exists/i.test(error.message) ? "email_taken" : "change_failed" }, 400);
      await admin.from("profiles").update({ phone: p.new_email }).eq("user_id", user.id);
      return json({ success: true });
    }

    if (p.action === "change_password") {
      const user = await sessionUser();
      if (!user?.email) return json({ error: "unauthorized" }, 401);
      const { error } = await anon().auth.signInWithPassword({ email: user.email, password: p.old_password });
      if (error) return json({ error: "bad_old_password" }, 400);
      const v = await callOtp({ action: "verify", email: user.email, otp_code: p.otp_code });
      if (!v.ok) return json({ error: "otp_invalid" }, 400);
      const { error: e2 } = await admin.auth.admin.updateUserById(user.id, { password: p.new_password });
      if (e2) return json({ error: "change_failed" }, 500);
      return json({ success: true });
    }

    return json({ error: "unknown" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "server_error" }, 500);
  }
});
