import type { Database } from "./database.types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient<Database> | undefined;
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Comments and login are not configured yet.");
  client ??= createClient<Database>(url, key, { auth: { flowType: "pkce", detectSessionInUrl: false } });
  return client;
}
