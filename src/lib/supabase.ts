import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Surfaced at build/runtime rather than failing silently with a confusing
  // "fetch failed" error deep inside a Supabase call.
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
      "Set them in .env.local (see .env.example) or in your Vercel project's Environment Variables."
  );
}

// Fall back to harmless placeholders so the build (including static
// prerendering) never crashes when env vars aren't set yet — real calls will
// simply fail at runtime with a clear network/auth error instead.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
