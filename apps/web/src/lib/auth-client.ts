/**
 * ログインのクライアント (Better Auth、Issue #117)。
 *
 *   - 本番: 画面と API は同じオリジン (Web の Worker が `/api/*` を中継)。セッションは HttpOnly の
 *     Cookie で、画面はトークンを持たない。状態は `GET /api/auth/get-session` で読む
 *   - ローカル開発: API (`127.0.0.1:8787`) へ開発用トークン (localStorage) を Bearer で送る
 *     (AGENTS.md「Local login without Google OAuth」)。API が localhost のときだけ使う
 */

import { readStellaStorage, removeStellaStorage } from "./brand-storage";

const TOKEN_KEY = "stella_auth_token_v1";
const LEGACY_TOKEN_KEY = "falcon_auth_token_v1";

const serverUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, "");
/** The API runs on this PC, so a self-signed dev token may be used (production never is). */
const localApi = (() => {
  try {
    return (
      Boolean(serverUrl) && ["localhost", "127.0.0.1"].includes(new URL(serverUrl ?? "").hostname)
    );
  } catch {
    return false;
  }
})();

export interface SessionUser {
  id: string;
  email?: string;
}

export interface Session {
  user: SessionUser;
}

export function isAuthConfigured(): boolean {
  return Boolean(serverUrl);
}

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();
let current: Session | null = null;
/** Whether `current` came from the session cookie (sign-out must then end it on the server). */
let fromCookie = false;

// The cookie is shared by every tab, but a tab only learns of a change when told: a tab that
// signs in or out says so here, and the others read the session again.
const tabs = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("stella-auth");
if (tabs) tabs.onmessage = () => void loadSession();

function setSession(session: Session | null): Session | null {
  current = session;
  for (const l of listeners) l(session);
  return session;
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** The dev token's session, or null (also when expired). */
function devSession(token: string): Session | null {
  const payload = decodeJwt(token);
  const sub = payload?.["sub"];
  if (typeof sub !== "string") return null;
  const exp = payload?.["exp"];
  if (typeof exp === "number" && exp * 1000 < Date.now()) return null;
  const email = payload?.["email"];
  return { user: { id: sub, ...(typeof email === "string" ? { email } : {}) } };
}

function readDevToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = readStellaStorage(window.localStorage, TOKEN_KEY);
  if (token && (!localApi || !devSession(token))) {
    // A token from the old login (or an expired one) is never sent to production.
    removeStellaStorage(window.localStorage, TOKEN_KEY);
    return null;
  }
  return token;
}

/** Reads who is signed in (the dev token, else the session cookie) and tells subscribers. */
export async function loadSession(): Promise<Session | null> {
  const token = readDevToken();
  fromCookie = false;
  if (token) return setSession(devSession(token));
  if (!serverUrl) return setSession(null);
  try {
    const res = await fetch(`${serverUrl}/api/auth/get-session`, { credentials: "include" });
    const data = res.ok
      ? ((await res.json()) as { user?: { id?: unknown; email?: unknown } } | null)
      : null;
    const id = data?.user?.id;
    if (typeof id !== "string") return setSession(null);
    const email = data?.user?.email;
    fromCookie = true;
    return setSession({ user: { id, ...(typeof email === "string" ? { email } : {}) } });
  } catch {
    return setSession(null);
  }
}

/** The last session read by `loadSession` (null until it has run). */
export function getSession(): Session | null {
  return current;
}

/** Google のログイン画面へ移る。戻り先は `/auth/callback` (元のページは AppShell が控える)。 */
export async function signInWithGoogle(): Promise<void> {
  if (!serverUrl) throw new Error("VITE_SERVER_URL が未設定のため Google ログインできません");
  const callbackURL = `${window.location.origin}/auth/callback`;
  const res = await fetch(`${serverUrl}/api/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "google", callbackURL, errorCallbackURL: callbackURL }),
  });
  const data = (await res.json().catch(() => null)) as { url?: unknown } | null;
  if (!res.ok || typeof data?.url !== "string")
    throw new Error("ログインを開始できませんでした。時間をおいてもう一度お試しください");
  window.location.assign(data.url);
}

/** `/auth/callback` で、Google から戻った結果を確かめる (失敗なら `?error=` が付いている)。 */
export async function completeLogin(
  search: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const error = new URLSearchParams(search).get("error");
  if (error) return { ok: false, error: `ログインできませんでした (${error})` };
  if (!(await loadSession()))
    return { ok: false, error: "ログインできませんでした。もう一度お試しください" };
  tabs?.postMessage("changed");
  return { ok: true };
}

/**
 * Ends the session on the server first: the HttpOnly cookie cannot be removed here, so showing
 * the user as signed out while the server session lives would come back on reload. Throws when
 * the server did not confirm (the caller tells the user).
 */
export async function signOut(): Promise<void> {
  if (fromCookie && serverUrl) {
    const res = await fetch(`${serverUrl}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => null);
    if (!res?.ok)
      throw new Error("ログアウトできませんでした。通信を確かめてもう一度お試しください");
  }
  if (typeof window !== "undefined") removeStellaStorage(window.localStorage, TOKEN_KEY);
  fromCookie = false;
  setSession(null);
  tabs?.postMessage("changed");
}

/** The dev token for `Authorization: Bearer` (local development only; production uses the cookie). */
export function getAccessToken(): string | null {
  return readDevToken();
}

export function subscribeToAuth(callback: Listener): () => void {
  listeners.add(callback);
  // Another tab changed the dev token.
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY || e.key === LEGACY_TOKEN_KEY) void loadSession();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
