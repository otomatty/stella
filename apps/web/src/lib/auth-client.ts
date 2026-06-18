/**
 * Cloudflare Workers 認証クライアント (Google OAuth + JWT)。
 *
 *   - Google ログインは API (`/api/auth/google`) へリダイレクト
 *   - コールバック後 JWT を localStorage に保持し、 api-client が Bearer に載せる
 */

const TOKEN_KEY = "falcon_auth_token_v1";

const serverUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, "");

export interface SessionUser {
  id: string;
  email?: string;
}

export interface Session {
  accessToken: string;
  user: SessionUser;
  expiresAt: number | null;
}

export function isAuthConfigured(): boolean {
  return Boolean(serverUrl);
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sessionFromToken(token: string): Session | null {
  const payload = decodeJwt(token);
  const sub = payload?.["sub"];
  if (typeof sub !== "string") return null;
  const exp = typeof payload?.["exp"] === "number" ? (payload["exp"] as number) : null;
  if (exp != null && exp * 1000 < Date.now()) return null;
  const email = typeof payload?.["email"] === "string" ? (payload["email"] as string) : undefined;
  return {
    accessToken: token,
    user: { id: sub, ...(email ? { email } : {}) },
    expiresAt: exp != null ? exp * 1000 : null,
  };
}

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();

function emit(session: Session | null): void {
  for (const l of listeners) l(session);
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  emit(token ? sessionFromToken(token) : null);
}

function authCallbackUrl(): string {
  if (typeof window === "undefined") return "/auth/callback";
  return `${window.location.origin}/auth/callback`;
}

/** Google ログイン画面へリダイレクトする。 */
export function signInWithGoogle(): void {
  if (!serverUrl) throw new Error("VITE_SERVER_URL が未設定のため Google ログインできません");
  const returnTo = encodeURIComponent(authCallbackUrl());
  window.location.assign(`${serverUrl}/api/auth/google?return_to=${returnTo}`);
}

/** OAuth コールバック URL の hash から JWT を取り出して保存する。 */
export function completeAuthFromCallbackHash(hash: string): { ok: true } | { ok: false; error: string } {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const error = params.get("error_description") ?? params.get("error");
  if (error) return { ok: false, error };

  const accessToken = params.get("access_token");
  if (!accessToken) return { ok: false, error: "トークンが返されませんでした" };

  storeToken(accessToken);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  storeToken(null);
}

export function getAccessToken(): string | null {
  const token = readToken();
  if (!token) return null;
  if (!sessionFromToken(token)) {
    storeToken(null);
    return null;
  }
  return token;
}

export function getSession(): Session | null {
  const token = readToken();
  if (!token) return null;
  const session = sessionFromToken(token);
  if (!session) {
    storeToken(null);
    return null;
  }
  return session;
}

export function subscribeToAuth(callback: Listener): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) callback(e.newValue ? sessionFromToken(e.newValue) : null);
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
