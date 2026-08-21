/**
 * Supabase Client & REST API Service for CodeXa Agency
 * Supports browser anon client, server service-role client,
 * PostgREST queries, Auth, Storage, and Realtime event streaming.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY));
}

interface SupabaseRequestOptions extends RequestInit {
  useServiceRole?: boolean;
  token?: string;
}

/**
 * Low-level universal PostgREST / Storage / Auth fetcher for Supabase
 */
export async function supabaseFetch<T = any>(
  endpoint: string,
  options: SupabaseRequestOptions = {}
): Promise<{ data: T | null; error: string | null; count?: number | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: "Supabase environment variables not configured." };
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${SUPABASE_URL.replace(/\/$/, "")}${cleanEndpoint}`;

  const apiKey = options.useServiceRole ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  const authHeader = options.token ? `Bearer ${options.token}` : `Bearer ${apiKey}`;

  const headers: Record<string, string> = {
    "apikey": apiKey,
    "Authorization": authHeader,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = `Supabase API error (${res.status}): ${res.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.message || errorJson.msg || errorJson.error_description || errorMsg;
      } catch {
        if (errorText) errorMsg = errorText;
      }
      return { data: null, error: errorMsg };
    }

    if (res.status === 204) {
      return { data: null, error: null };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Network request failed." };
  }
}

// ─── AUTHENTICATION HELPERS ──────────────────────────────────────────────────

export async function supabaseSignInWithPassword(email: string, password: string) {
  return supabaseFetch<{ access_token: string; refresh_token: string; user: any }>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function supabaseSendPasswordResetEmail(email: string, redirectTo?: string) {
  return supabaseFetch("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });
}

export async function supabaseAdminCreateUser(params: {
  email: string;
  password: string;
  user_metadata?: Record<string, any>;
  email_confirm?: boolean;
}) {
  return supabaseFetch<{ id: string; email: string; user_metadata: any }>("/auth/v1/admin/users", {
    method: "POST",
    useServiceRole: true,
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      user_metadata: params.user_metadata || {},
      email_confirm: params.email_confirm ?? true,
    }),
  });
}

// ─── POSTGREST TABLE HELPERS ────────────────────────────────────────────────

export async function supabaseQuery<T = any>(
  table: string,
  queryParamString = "select=*",
  useServiceRole = true
) {
  return supabaseFetch<T[]>(`/rest/v1/${table}?${queryParamString}`, {
    method: "GET",
    useServiceRole,
  });
}

export async function supabaseInsert<T = any>(
  table: string,
  payload: any | any[],
  useServiceRole = true
) {
  return supabaseFetch<T[]>(`/rest/v1/${table}`, {
    method: "POST",
    useServiceRole,
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(payload),
  });
}

export async function supabaseUpdate<T = any>(
  table: string,
  matchParams: string, // e.g. "id=eq.123"
  payload: any,
  useServiceRole = true
) {
  return supabaseFetch<T[]>(`/rest/v1/${table}?${matchParams}`, {
    method: "PATCH",
    useServiceRole,
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify(payload),
  });
}

export async function supabaseDelete(
  table: string,
  matchParams: string, // e.g. "id=eq.123"
  useServiceRole = true
) {
  return supabaseFetch(`/rest/v1/${table}?${matchParams}`, {
    method: "DELETE",
    useServiceRole,
  });
}

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────

export async function supabaseUploadFile(
  bucket: string,
  filePath: string,
  fileBody: Blob | ArrayBuffer | Buffer,
  contentType = "image/jpeg"
) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: "Supabase not configured." };
  }

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: fileBody as any,
    });

    if (!res.ok) {
      const err = await res.text();
      return { data: null, error: err };
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    return { data: { publicUrl, path: filePath }, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
