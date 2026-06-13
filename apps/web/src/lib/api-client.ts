/**
 * Hono API (Cloudflare Workers) を叩く共通 HTTP クライアント。
 *
 * Neon 移行後、 フロントは DB を直接叩かず全てこのクライアント経由で API を呼ぶ。
 * Neon Auth のアクセストークンを Authorization: Bearer に自動で載せる。
 *
 * 旧 Supabase クライアントの `.from().select()` / `.rpc()` を置き換える基盤。
 */

import { getAccessToken } from "./neon-auth";

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
