import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

let cachedClient: SupabaseClient | null = null;

export const createSupabaseBrowserClient = () => {
  if (cachedClient) return cachedClient;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  cachedClient = createBrowserClient(url, key);
  return cachedClient;
};
