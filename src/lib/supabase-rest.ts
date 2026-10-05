export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: AuthUser;
};

const SESSION_KEY = "odb_supabase_session";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url, key, configured: Boolean(url && key) };
}

export function isSupabaseConfigured() {
  return config().configured;
}

function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("odb-auth-updated"));
    return;
  }
  const normalized: AuthSession = {
    ...session,
    expires_at: session.expires_at || (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined),
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event("odb-auth-updated"));
}

async function parseError(response: Response) {
  let message = `Erro ${response.status}`;
  try {
    const body = await response.json();
    message = body?.msg || body?.message || body?.error_description || body?.error || message;
  } catch {
    // Keep fallback message.
  }
  return new Error(message);
}

async function refreshSession(current: AuthSession): Promise<AuthSession | null> {
  const { url, key, configured } = config();
  if (!configured || !current.refresh_token) return null;
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  });
  if (!response.ok) {
    storeSession(null);
    return null;
  }
  const session = (await response.json()) as AuthSession;
  storeSession(session);
  return session;
}

export async function getSession(): Promise<AuthSession | null> {
  const current = getStoredSession();
  if (!current) return null;
  if (!current.expires_at || current.expires_at - Math.floor(Date.now() / 1000) > 60) return current;
  return refreshSession(current);
}

export const auth = {
  async signIn(email: string, password: string) {
    const { url, key, configured } = config();
    if (!configured) throw new Error("Supabase ainda não está configurado neste ambiente.");
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw await parseError(response);
    const session = (await response.json()) as AuthSession;
    storeSession(session);
    return session;
  },

  async signUp(input: { name: string; phone?: string; email: string; password: string }) {
    const { url, key, configured } = config();
    if (!configured) throw new Error("Supabase ainda não está configurado neste ambiente.");
    const response = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        data: { full_name: input.name, phone: input.phone || "" },
      }),
    });
    if (!response.ok) throw await parseError(response);
    const payload = await response.json();
    if (payload?.access_token) storeSession(payload as AuthSession);
    return payload;
  },

  async signOut() {
    const { url, key, configured } = config();
    const session = getStoredSession();
    if (configured && session?.access_token) {
      await fetch(`${url}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
      }).catch(() => undefined);
    }
    storeSession(null);
  },

  async recover(email: string) {
    const { url, key, configured } = config();
    if (!configured) throw new Error("Supabase ainda não está configurado neste ambiente.");
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const response = await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirect_to: redirectTo }),
    });
    if (!response.ok) throw await parseError(response);
  },

  async updatePassword(accessToken: string, password: string) {
    const { url, key, configured } = config();
    if (!configured) throw new Error("Supabase ainda não está configurado neste ambiente.");
    const response = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw await parseError(response);
    return response.json();
  },

  getStoredSession,
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
  headers?: Record<string, string>;
  prefer?: string;
};

export async function supabaseRest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { url, key, configured } = config();
  if (!configured) throw new Error("Supabase ainda não está configurado neste ambiente.");

  const session = options.authenticated === false ? null : await getSession();
  const token = session?.access_token || key;
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (options.prefer) headers.Prefer = options.prefer;

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function rpc<T = unknown>(name: string, body: Record<string, unknown>, authenticated = true): Promise<T> {
  return supabaseRest<T>(`rpc/${name}`, { method: "POST", body, authenticated });
}
