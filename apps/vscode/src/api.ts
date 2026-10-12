import type { AuthStore } from "./auth.js";
import { stellaConfig } from "./config.js";

/**
 * 接続が切れたときの案内。拡張が持つキー (Clerk の API キー) は 30 日で切れ、アカウントの無効化や
 * 管理画面の失効でも取り消される。切れたら Web のレッスンから接続し直してもらう。
 */
export const RECONNECT_MESSAGE =
  "LMS への接続の有効期限が切れました。Web のレッスンの「VS Code で開く」から接続し直してください";

export class AuthExpiredError extends Error {
  readonly status = 401 as const;

  constructor(message = RECONNECT_MESSAGE) {
    super(message);
    this.name = "AuthExpiredError";
  }
}

let authStore: AuthStore | undefined;

export function initApi(store: AuthStore): void {
  authStore = store;
}

function requireAuthStore(): AuthStore {
  if (!authStore) {
    throw new Error("AuthStore is not initialized");
  }
  return authStore;
}

function serverUrl(): string {
  return stellaConfig("serverUrl", "http://127.0.0.1:8787");
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

type ApiInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  /**
   * 接続の世代 (`authSession()`)。渡すと、その世代のトークンでだけ送る。トークンを読んだあとで
   * 世代が変わっていれば (接続の切り替えの途中)、送らずに `AuthSessionChanged` を投げる。
   */
  session?: number;
};

/**
 * 拡張が持つトークンを載せたヘッダー。本番は接続のときに受け取った Clerk の API キーを、
 * Clerk の無いローカルの API は開発用のトークンを、どちらも `Authorization: Bearer` で送る。
 */
export function setAuthHeaders(headers: Headers, token: string): void {
  headers.set("Authorization", `Bearer ${token}`);
}

function isJsonResponse(res: Response): boolean {
  const type = res.headers.get("content-type") ?? "";
  return /\bjson\b/i.test(type);
}

function isHtmlResponse(res: Response): boolean {
  return /text\/html/i.test(res.headers.get("content-type") ?? "");
}

/**
 * API に届く前に止められた応答か (宛先が講師・管理者用の入口で Cloudflare Access に止められた、
 * 途中の proxy のログイン画面など)。ログイン画面へのリダイレクト (`redirect: "manual"` では 3xx か
 * `opaqueredirect` / status 0) か、HTML のブロック画面 (401/403) を返す。API 自身の 401/403 は JSON
 * なので、こちらには入らない。
 */
export function isAccessRejection(res: Response): boolean {
  if (res.type === "opaqueredirect" || res.status === 0) return true;
  if (res.status >= 300 && res.status < 400) return true;
  return (res.status === 401 || res.status === 403) && !isJsonResponse(res);
}

/** 本文を JSON として読む。HTML や空の本文では落とさずに null を返す。 */
async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (text.trim() === "") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, init: ApiInit = {}): Promise<T> {
  const auth = requireAuthStore();
  const url = `${serverUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const { body: rawBody, session, ...rest } = init;
  // 世代を確かめたトークンを、await を挟まずに送る (世代とトークンを不可分に扱う)。
  const token =
    session === undefined ? await auth.getToken() : await auth.getTokenInSession(session);
  const headers = new Headers(init.headers);
  if (token) {
    setAuthHeaders(headers, token);
  }

  let body: BodyInit | undefined;
  if (typeof rawBody === "string") {
    body = rawBody;
  } else if (rawBody !== undefined && rawBody !== null) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(rawBody);
  }

  // ログイン画面へのリダイレクトを追わない (追うと HTML の 200 が返り、接続切れに見えない)。
  const res = await fetch(url, { ...rest, headers, body, redirect: "manual" });
  const accessRejected = isAccessRejection(res);
  const data = accessRejected ? null : await readJson(res);

  if (accessRejected || res.status === 401) {
    // 前の世代のトークンが断られただけなら、切り替えたあとの接続を消さない。
    if (session === undefined || session === auth.currentSession()) await auth.clear();
    throw new AuthExpiredError(
      accessRejected ? RECONNECT_MESSAGE : errorMessage(data, RECONNECT_MESSAGE),
    );
  }

  if (!res.ok) {
    throw new Error(errorMessage(data, `API ${res.status}`));
  }

  if (data === null && isHtmlResponse(res)) {
    // API ではなく Web の画面 (index.html) が返った。宛先の設定違い。
    throw new Error(
      "LMS の API から応答がありません。設定 stella.serverUrl が Web の URL (本番) か API の URL (ローカル) を指しているか確認してください",
    );
  }

  return data as T;
}
