/**
 * Hono API (Cloudflare Workers) を叩く共通 HTTP クライアント。
 *
 * フロントは DB を直接叩かず、すべてこのクライアント経由で API を呼ぶ。認証の載せ方は
 * `auth-client` の方式で変わる:
 *
 *   - clerk … Clerk のセッショントークンを Authorization: Bearer に載せて、同じオリジンの `/api/*`
 *     へ送る (Web の Worker が API へ中継する)。トークンが切れていたら (API の 401) 1 度だけ取り直して
 *     送り直す。講師・管理者用の入口は Cloudflare Access の後ろにあり、Access のセッションが切れると
 *     ログインへのリダイレクトか Access の HTML が返るので、1 度だけページを読み込み直して Access に
 *     ログインし直させる (`reloadForAccessLogin`)。
 *   - dev-token … 開発用 JWT を Authorization: Bearer に載せる (ローカル開発だけ)。
 *
 * JSON 以外 (アップロード・ダウンロード・SSE) で生の Response が要るところも `authFetch` を通す —
 * 認証の載せ方と、セッション切れの扱いを 1 か所に揃えるため。
 */

import { authHeaders, isClerkMode, isStaffHost, reloadForAccessLogin } from "./auth-client";
import { DEV_MODE_HEADER, devModeHeaderValue, isDevModeEnabled } from "./dev-mode";

/**
 * API のオリジン (末尾スラッシュなし)。`VITE_SERVER_URL` で指定。本番は受講者用の Web のオリジン。
 * 講師・管理者用の入口で開いているときは、その入口自身のオリジンを使う — 同じ成果物を 2 つの入口で
 * 配るため。Access が付けるヘッダは、講師・管理者用の入口を通ったリクエストにしか付かない。
 */
function serverUrl(): string {
  const configured = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
  if (configured && isStaffHost()) return window.location.origin;
  return configured;
}

export function isApiConfigured(): boolean {
  return Boolean(serverUrl());
}

/** API のパス (`/api/...`) を完全な URL にする。 */
export function apiUrl(path: string): string {
  return `${serverUrl()}${path}`;
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** true の場合、認証を付けず、セッション切れの扱いもしない (公開エンドポイント用)。 */
  anonymous?: boolean;
  /**
   * true の場合、認証は取れたときだけ付ける (ログインなしでも受け付けるエンドポイント用)。
   * Clerk を読み込めない障害のときも、トークンなしで送る (問い合わせフォームなど)。
   */
  optionalAuth?: boolean;
}

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

/** 講師・管理者用の入口で Access のセッションが切れていた。`reloading` ならページを読み込み直している最中。 */
export class AccessSessionLostError extends ApiClientError {
  reloading: boolean;
  constructor(message: string, reloading: boolean) {
    super(message, 401);
    this.name = "AccessSessionLostError";
    this.reloading = reloading;
  }
}

/** `authFetch` の init。ヘッダは素のオブジェクトで受ける (認証ヘッダと混ぜるため)。 */
export type AuthFetchInit = Omit<RequestInit, "headers" | "credentials" | "redirect"> & {
  headers?: Record<string, string>;
};

/**
 * API に届く前に Cloudflare Access に止められた応答か (講師・管理者用の入口で Access のセッションが
 * 切れた)。`redirect: "manual"` で Access のログインへのリダイレクトを受けると opaqueredirect
 * (status 0) になる。Access の方針から外れたときは、Access が JSON でない 401/403 (HTML) を返す
 * (API 自身の 401/403 は JSON なので分けられる)。
 */
export function isAccessSessionLost(
  res: Pick<Response, "type" | "status"> & { headers?: Pick<Headers, "get"> },
): boolean {
  if (res.type === "opaqueredirect" || res.status === 0) return true;
  if (res.status !== 401 && res.status !== 403) return false;
  const contentType = res.headers?.get("content-type") ?? "";
  return !/\bjson\b/i.test(contentType);
}

/** 送り直せる本文か (読み切ってしまうストリームは送り直せない)。 */
function isReplayableBody(body: AuthFetchInit["body"]): boolean {
  return !(typeof ReadableStream !== "undefined" && body instanceof ReadableStream);
}

/**
 * 認証付きで API を呼び、生の Response を返す (エラー応答もそのまま返す)。
 * clerk で講師・管理者用の入口の Access のセッションが切れていたら、ページを読み込み直して
 * `AccessSessionLostError` (401) を投げる。
 */
export async function authFetch(
  path: string,
  init: AuthFetchInit = {},
  { anonymous = false, optionalAuth = false }: { anonymous?: boolean; optionalAuth?: boolean } = {},
): Promise<Response> {
  const clerk = isClerkMode();
  const headersFor = async (skipCache: boolean): Promise<Record<string, string>> => {
    if (anonymous) return {};
    if (!optionalAuth) return authHeaders({ skipCache });
    return authHeaders({ skipCache }).catch((err: unknown) => {
      console.warn("[api-client] sending without authentication", err);
      return {};
    });
  };
  const send = async (skipCache: boolean) =>
    fetch(apiUrl(path), {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(await headersFor(skipCache)),
      },
      // 同じオリジンなので Cookie (講師・管理者用の入口では Access の CF_Authorization) は既定で
      // 送られる。明示しておき、Access のログインへのリダイレクトは追わずに受け取る (追うと別オリジンの
      // HTML を読みに行って CORS で失敗し、原因の分からないネットワークエラーになる)。
      ...(clerk ? { credentials: "same-origin" as const, redirect: "manual" as const } : {}),
    });
  let res = await send(false);
  if (clerk && !anonymous && isAccessSessionLost(res)) {
    const reloading = reloadForAccessLogin();
    throw new AccessSessionLostError(
      reloading
        ? "ログインの有効期限が切れたため、ページを読み込み直しています"
        : "講師・管理者用の入口 (Cloudflare Access) のログインを確認できませんでした。ページを読み込み直してください",
      reloading,
    );
  }
  // Clerk のトークンが API に届くまでに切れた (端末の時計のずれ・タブの休止明け)。取り直して 1 度だけ送り直す。
  if (clerk && !anonymous && res.status === 401 && isReplayableBody(init.body)) {
    res = await send(true);
  }
  return res;
}

/** エラー応答の本文から表示用のメッセージを作る (`{ error }` があればそれ)。 */
export async function readApiError(res: Response, fallback?: string): Promise<string> {
  let message = fallback ?? `サーバエラー (${res.status})`;
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: string };
      message = data.error ?? (fallback ? message : `${message}: ${text}`);
    } catch {
      if (!fallback) message = `${message}: ${text}`;
    }
  }
  return message;
}

/**
 * API を呼び、JSON を返す。非 2xx はサーバの `{ error }` を含む例外を投げる。
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, signal, anonymous = false, optionalAuth = false } = options;
  const headers: Record<string, string> = {
    [DEV_MODE_HEADER]: devModeHeaderValue(isDevModeEnabled()),
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await authFetch(
    path,
    {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    },
    { anonymous, optionalAuth },
  );

  if (!res.ok) throw new ApiClientError(await readApiError(res), res.status);

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * バイナリ送受信用の低レベル版。body を JSON 化せずそのまま送り、Response を返す。
 * 音声 (面談対策の読み上げ取得・録音アップロード) など JSON 以外のやり取りに使う。
 */
export async function apiFetchRaw(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: BodyInit;
    contentType?: string;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const { method = "GET", body, contentType, signal } = options;
  const headers: Record<string, string> = {
    [DEV_MODE_HEADER]: devModeHeaderValue(isDevModeEnabled()),
  };
  if (contentType) headers["Content-Type"] = contentType;

  const res = await authFetch(path, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) throw new ApiClientError(await readApiError(res), res.status);
  return res;
}
