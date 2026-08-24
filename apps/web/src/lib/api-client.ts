/**
 * Hono API (Cloudflare Workers) を叩く共通 HTTP クライアント。
 *
 * Neon 移行後、 フロントは DB を直接叩かず全てこのクライアント経由で API を呼ぶ。
 * Neon Auth のアクセストークンを Authorization: Bearer に自動で載せる。
 *
 * 旧 BaaS クライアントの `.from().select()` / `.rpc()` を置き換える基盤。
 */

import { getAccessToken } from "./auth-client";

/** Cloudflare Workers API のオリジン (末尾スラッシュなし)。 `VITE_SERVER_URL` で指定。 */
const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");

export function isApiConfigured(): boolean {
  return Boolean(SERVER_URL);
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** true の場合、 トークンが無くてもエラーにしない (公開エンドポイント用)。 */
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

/**
 * API を呼び、 JSON を返す。 非 2xx はサーバの `{ error }` を含む例外を投げる。
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, signal, anonymous = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!anonymous) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) {
    let message = `サーバエラー (${res.status})`;
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        const data = JSON.parse(text) as { error?: string };
        message = data.error ?? `${message}: ${text}`;
      } catch {
        message = `${message}: ${text}`;
      }
    }
    throw new ApiClientError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * バイナリ送受信用の低レベル版。 body を JSON 化せずそのまま送り、 Response を返す。
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
  const headers: Record<string, string> = {};
  if (contentType) headers["Content-Type"] = contentType;
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) {
    let message = `サーバエラー (${res.status})`;
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        const data = JSON.parse(text) as { error?: string };
        message = data.error ?? `${message}: ${text}`;
      } catch {
        message = `${message}: ${text}`;
      }
    }
    throw new ApiClientError(message, res.status);
  }
  return res;
}
