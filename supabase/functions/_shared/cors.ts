// Shared CORS helper — strict origin allow-list (no wildcards).
const ALLOWED_EXACT = new Set<string>([
  "https://ykgameshop.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
]);

// Allowed host suffixes (Lovable preview/published + Vercel deployments)
const ALLOWED_SUFFIXES = [".lovable.app", ".lovableproject.com", ".vercel.app"];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_EXACT.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    return ALLOWED_SUFFIXES.some((s) => url.hostname.endsWith(s));
  } catch {
    return false;
  }
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "https://ykgameshop.lovable.app",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
