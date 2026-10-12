/**
 * 認証クライアント。アプリはパスワードも OAuth も持たず、ログインは 2 つの方式のどちらかで行う。
 *
 *   - `clerk` (本番の既定) … Clerk がログイン (Google・メールの確認コード)・セッションの更新と失効を
 *     受け持つ。画面は Clerk のセッショントークン (約 60 秒で切れ、SDK が更新する) を `/api/*` へ
 *     `Authorization: Bearer` で送る。誰なのか (アプリの profiles) は `/api/me` の応答で知る。
 *     講師・管理者は Cloudflare Access で守った講師・管理者用の入口 (`VITE_STAFF_ORIGIN`) から使う。
 *   - `dev-token` (`vite dev` の既定) … Clerk の無いローカル開発用。手で発行した開発用の JWT
 *     (`bun run --filter=@stella/api dev:token <profileId>`) を localStorage に置き、Bearer で送る。
 *     API はローカル (localhost / 127.0.0.1) のリクエストでだけこれを受け付ける。
 *
 * 方式は `VITE_AUTH_MODE` (`clerk` | `dev-token`) で選ぶ。未指定なら dev サーバーは `dev-token`、
 * build した成果物は `clerk`。
 */

import { readStellaStorage, removeStellaStorage } from "./brand-storage";
import {
  clerkCurrentUser,
  clerkSessionToken,
  clerkSignOut,
  onClerkUserChange,
  type ClerkUserSummary,
} from "./clerk";

const TOKEN_KEY = "stella_auth_token_v1";
const LEGACY_TOKEN_KEY = "falcon_auth_token_v1";
/** 講師・管理者用の入口の Access のログインのために読み込み直した時刻 (読み込み直しの繰り返しを止める)。 */
const ACCESS_RELOAD_KEY = "stella_access_reload_at_v1";
/** この間隔の中で 2 度目の読み込み直しはしない (Access を通っても止められ続ける設定ミスで回り続けないため)。 */
export const ACCESS_RELOAD_GUARD_MS = 30_000;

export type AuthMode = "clerk" | "dev-token";

/** `VITE_AUTH_MODE` の値と dev サーバーかどうかから方式を決める (未知の値は既定に倒す)。 */
export function resolveAuthMode(raw: unknown, isDev: boolean): AuthMode {
  if (raw === "clerk" || raw === "dev-token") return raw;
  return isDev ? "dev-token" : "clerk";
}

/** いまの方式。テストで `vi.stubEnv` が効くよう、呼ぶたびに読む。 */
export function authMode(): AuthMode {
  return resolveAuthMode(import.meta.env.VITE_AUTH_MODE, Boolean(import.meta.env.DEV));
}

/** Clerk でログインする方式か (画面はアプリの利用者 ID を `/api/me` で知る)。 */
export function isClerkMode(): boolean {
  return authMode() === "clerk";
}

/** 講師・管理者用の入口 (Cloudflare Access で守ったオリジン)。未設定なら空。 */
export function staffOrigin(): string {
  return (import.meta.env.VITE_STAFF_ORIGIN ?? "").trim().replace(/\/+$/, "");
}

/** いま講師・管理者用の入口で開いているか。 */
export function isStaffHost(): boolean {
  const origin = staffOrigin();
  return Boolean(origin) && typeof window !== "undefined" && window.location.origin === origin;
}

function serverUrl(): string {
  return (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
}

export interface SessionUser {
  id: string;
  email?: string;
}

export interface Session {
  /** 開発用トークン (dev-token のときだけ)。clerk では常に null。 */
  accessToken: string | null;
  user: SessionUser;
  expiresAt: number | null;
}

export function isAuthConfigured(): boolean {
  return Boolean(serverUrl());
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
  if (typeof sub !== "string" || !sub) return null;
  const exp = typeof payload?.["exp"] === "number" ? (payload["exp"] as number) : null;
  if (exp != null && exp * 1000 < Date.now()) return null;
  const email = typeof payload?.["email"] === "string" ? (payload["email"] as string) : undefined;
  return {
    accessToken: token,
    user: { id: sub, ...(email ? { email } : {}) },
    expiresAt: exp != null ? exp * 1000 : null,
  };
}

/** clerk: Clerk の利用者からの仮のセッション (アプリの利用者 ID は `/api/me` の応答で置き換える)。 */
function sessionFromClerkUser(user: ClerkUserSummary | null): Session | null {
  if (!user) return null;
  return {
    accessToken: null,
    user: { id: user.id, ...(user.email ? { email: user.email } : {}) },
    expiresAt: null,
  };
}

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();

function emit(session: Session | null): void {
  for (const l of listeners) l(session);
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return readStellaStorage(window.localStorage, TOKEN_KEY);
}

function storeToken(token: string | null): boolean {
  if (typeof window === "undefined") return true;
  if (token) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      return false;
    }
    try {
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      // 新キーは保存済み。旧キーが残っても次の読み取りは新キーを使う。
    }
  } else removeStellaStorage(window.localStorage, TOKEN_KEY);
  emit(token ? sessionFromToken(token) : null);
  return true;
}

/**
 * clerk では以前の方式 (Google ログイン・開発用) の JWT を端末に残さない。消せなくても続ける
 * (clerk では読まないので、残っても API には送られない)。
 */
export function purgeStoredTokens(): void {
  if (typeof window === "undefined") return;
  for (const key of [TOKEN_KEY, LEGACY_TOKEN_KEY]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 読まない値なので、消せないままでも害は無い。
    }
  }
}

/**
 * dev-token: 貼り付けた開発用トークンを確かめて保存する。署名はここでは確かめられない
 * (API が確かめる) ので、読めて期限内かだけを見る。
 */
export function signInWithDevToken(raw: string): { ok: true } | { ok: false; error: string } {
  if (isClerkMode()) {
    return { ok: false, error: "Clerk でログインする設定のため、トークンは使えません" };
  }
  const token = raw.trim().replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, error: "トークンを貼り付けてください" };
  const payload = decodeJwt(token);
  if (!payload || typeof payload["sub"] !== "string" || !payload["sub"]) {
    return { ok: false, error: "トークンを読めませんでした (JWT の形ではありません)" };
  }
  if (!sessionFromToken(token)) {
    return { ok: false, error: "トークンの有効期限が切れています。発行し直してください" };
  }
  if (!storeToken(token)) return { ok: false, error: "トークンを保存できませんでした" };
  return { ok: true };
}

/** ログアウト。clerk は Clerk のセッションを終える。dev-token は端末のトークンを消す。 */
export async function signOut(): Promise<void> {
  if (isClerkMode()) {
    purgeStoredTokens();
    await clerkSignOut();
    emit(null);
    return;
  }
  storeToken(null);
}

/** dev-token の開発用トークン。clerk では常に null (Clerk のトークンは `authHeaders` が取る)。 */
export function getAccessToken(): string | null {
  if (isClerkMode()) return null;
  const token = readToken();
  if (!token) return null;
  if (!sessionFromToken(token)) {
    storeToken(null);
    return null;
  }
  return token;
}

/**
 * API へ付ける認証ヘッダ。clerk は Clerk のセッショントークン (切れていれば SDK が更新したもの)、
 * dev-token は開発用トークン。ログインしていなければ空。
 */
export async function authHeaders(
  options: { skipCache?: boolean } = {},
): Promise<Record<string, string>> {
  const token = isClerkMode() ? await clerkSessionToken(options) : getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getSession(): Promise<Session | null> {
  if (isClerkMode()) {
    purgeStoredTokens();
    if (!isAuthConfigured()) return null;
    return sessionFromClerkUser(await clerkCurrentUser());
  }
  const token = readToken();
  if (!token) return null;
  const session = sessionFromToken(token);
  if (!session) {
    storeToken(null);
    return null;
  }
  return session;
}

/**
 * 講師・管理者用の入口で Access のセッションが切れた (API がリダイレクト・Access の HTML を返した)
 * ときに、1 度だけページを読み込み直して Access のログインへ回す。直前 (`ACCESS_RELOAD_GUARD_MS`
 * 以内) にも読み込み直していたら何もせず false を返す — Access を通っても止められ続ける設定のときに
 * 読み込み直しを繰り返さないため (呼び出し側がエラーを出す)。
 */
export function reloadForAccessLogin(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  let last = Number.NaN;
  try {
    last = Number(window.sessionStorage.getItem(ACCESS_RELOAD_KEY));
  } catch {
    // 読めなければ初回として扱う。
  }
  if (Number.isFinite(last) && last > 0 && now - last < ACCESS_RELOAD_GUARD_MS) return false;
  try {
    window.sessionStorage.setItem(ACCESS_RELOAD_KEY, String(now));
  } catch {
    // 印を残せないと繰り返しを止められないので、読み込み直さない。
    return false;
  }
  window.location.reload();
  return true;
}

export function subscribeToAuth(callback: Listener): () => void {
  listeners.add(callback);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(callback);
    };
  }
  if (isClerkMode()) {
    // ログイン状態は Clerk が持つ (別のタブでのログイン・ログアウトも Clerk が伝える)。
    let unsubscribe: (() => void) | null = null;
    let closed = false;
    void onClerkUserChange((user) => callback(sessionFromClerkUser(user)))
      .then((off) => {
        if (closed) off();
        else unsubscribe = off;
      })
      .catch(() => undefined);
    return () => {
      closed = true;
      listeners.delete(callback);
      unsubscribe?.();
    };
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) {
      callback(e.newValue ? sessionFromToken(e.newValue) : null);
      return;
    }
    // 旧タブのログアウトは旧キーだけ消す。今のトークンと同じときだけ追随する。
    if (e.key !== LEGACY_TOKEN_KEY || e.oldValue !== readToken()) return;
    if (!e.newValue) {
      storeToken(null);
      return;
    }
    try {
      window.localStorage.setItem(TOKEN_KEY, e.newValue);
    } catch {
      return;
    }
    emit(sessionFromToken(e.newValue));
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}
