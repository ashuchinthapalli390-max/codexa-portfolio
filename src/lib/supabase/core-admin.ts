if (typeof window !== "undefined") {
  throw new Error("core-admin.ts cannot be imported in client-side code");
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isCoreSupabaseAdminConfigured = (): boolean => Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

export const coreSupabaseAdmin = isCoreSupabaseAdminConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
