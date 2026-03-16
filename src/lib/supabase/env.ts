const required = (value: string | undefined, errorMessage: string) => {
  if (!value || value.trim().length === 0) {
    throw new Error(errorMessage);
  }
  return value;
};

export const getSupabaseUrl = () =>
  required(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    "Missing Supabase URL env var. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).",
  );

export const getSupabaseAnonKey = () =>
  required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    "Missing Supabase anon key env var. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY).",
  );

export const getSupabaseServiceRoleKey = () =>
  required(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Missing Supabase service role env var. Set SUPABASE_SERVICE_ROLE_KEY.",
  );