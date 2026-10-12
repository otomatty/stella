/**
 * Hono API (Cloudflare Workers) を叩く共通 HTTP クライアント。
 *
 * フロントは DB を直接叩かず、すべてこのクライアント経由で API を呼ぶ。認証の載せ方は
 * `auth-client` の方式で変わる:
 *
 *   - access … 同じオリジンの `/api/*` へ Cookie ごと送る (Authorization は付けない)。Web の
 *     Worker が API へ中継し、Access が `Cf-Access-Jwt-Assertion` を付ける。Access のセッションが
 *     切れていると Access のログインへのリダイレクトか 401 が返るので、1 度だけページを読み込み
 *     直して Access にログインし直させる (`reloadForAccessLogin`)。
 *   - dev-token … 開発用 JWT を Authorization: Bearer に載せる (ローカル開発だけ)。
 *
 * JSON 以外 (アップロード・ダウンロード・SSE) で生の Response が要るところも `authFetch` を通す —
 * 認証の載せ方と、Access のセッション切れの扱いを 1 か所に揃えるため。
 */

import { authHeaders, isAccessMode, reloadForAccessLogin } from "./auth-client";
import { DEV_MODE_HEADER, devModeHeaderValue, isDevModeEnabled } from "./dev-mode";

/** API のオリジン (末尾スラッシュなし)。`VITE_SERVER_URL` で指定。本番は Web 自身のオリジン。 */
function serverUrl(): string {
  return (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
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
}

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

/** access で Access のセッションが切れていた。`reloading` ならページを読み込み直している最中。 */
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
 * Access のセッションが切れた応答か。`redirect: "manual"` で Access のログインへの
 * リダイレクトを受けると opaqueredirect (status 0) になる。Access を通ったのに API が
 * トークンを受け付けなかったときは 401。
 */
export function isAccessSessionLost(res: Pick<Response, "type" | "status">): boolean {
  return res.type === "opaqueredirect" || res.status === 0 || res.status === 401;
}

/**
 * 認証付きで API を呼び、生の Response を返す (エラー応答もそのまま返す)。
 * access で Access のセッションが切れていたら、ページを読み込み直して `AccessSessionLostError` (401) を投げる。
 */
export async function authFetch(
  path: string,
  init: AuthFetchInit = {},
  { anonymous = false }: { anonymous?: boolean } = {},
): Promise<Response> {
  const access = isAccessMode();
  const headers: Record<string, string> = {
    ...(init.headers ?? {}),
    ...(anonymous ? {} : authHeaders()),
  };
  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
    // access は同じオリジンなので Cookie (CF_Authorization) は既定で送られる。明示しておき、
    // Access のログインへのリダイレクトは追わずに受け取る (追うと別オリジンの HTML を読みに行って
    // CORS で失敗し、原因の分からないネットワークエラーになる)。
    ...(access ? { credentials: "same-origin" as const, redirect: "manual" as const } : {}),
  });
  if (access && !anonymous && isAccessSessionLost(res)) {
    const reloading = reloadForAccessLogin();
    throw new AccessSessionLostError(
      reloading
        ? "ログインの有効期限が切れたため、ページを読み込み直しています"
        : "Cloudflare Access のログインを確認できませんでした。ページを読み込み直してください",
      reloading,
    );
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
  const { method = "GET", body, signal, anonymous = false } = options;
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
    { anonymous },
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
    method?: "GET" | "POST";
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
