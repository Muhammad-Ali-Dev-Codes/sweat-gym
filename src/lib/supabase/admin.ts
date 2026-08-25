import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with elevated privileges.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS and unlocks the auth.admin
 * API (e.g. permanent account deletion). NEVER import this module from a
 * client component; it must stay behind "use server" boundaries.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      // The admin client performs discrete privileged operations; it must
      // never persist or read the caller's session cookies.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
