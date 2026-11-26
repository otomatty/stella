/**
 * VS Code の SecretStorage に保存するトークンの読み書き。
 */
export interface ApiAuth {
  currentSession(): number;
  getToken(): Promise<string | null>;
  getTokenInSession(expected: number): Promise<string | null>;
  clear(): Promise<void>;
}

export class AuthExpiredError extends Error {
  readonly status = 401 as const;

  constructor(message = "認証の有効期限が切れました") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

let authStore: ApiAuth | undefined;
let resolveServerUrl: (() => string) | undefined;

export function initApi(store: ApiAuth, serverUrl: () => string): void {
  authStore = store;
  resolveServerUrl = serverUrl;
}

/** 複数の API 呼び出しを、フォームを開いたときの接続にそろえる。 */
export function apiSession(): number | undefined {
  return authStore?.currentSession();
}

function requireAuthStore(): ApiAuth {
  if (!authStore) {
    throw new Error("AuthStore is not initialized");
  }
  return authStore;
}

function serverUrl(): string {
  if (!resolveServerUrl) throw new Error("API の接続先が設定されていません");
  return resolveServerUrl().replace(/\/+$/, "");
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

/** 提出などの通信が返らないとき、確認や提出の操作を止めないための上限。 */
export const API_TIMEOUT_MS = 60_000;

const API_TIMEOUT_MESSAGE =
  "LMS から応答がありませんでした。通信を確かめて、もう一度実行してください";

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

type ApiInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  /**
   * 接続の世代 (`authSession()`)。渡すと、その世代のトークンでだけ送る。トークンを読んだあとで
   * 世代が変わっていれば (接続の切り替えの途中)、送らずに `AuthSessionChanged` を投げる。
   */
  session?: number;
};

export async function apiRequest<T>(path: string, init: ApiInit = {}): Promise<T> {
  const auth = requireAuthStore();
  const url = `${serverUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const { body: rawBody, session, signal: callerSignal, ...rest } = init;
  // 世代を確かめたトークンを、await を挟まずに送る (世代とトークンを不可分に扱う)。
  const token =
    session === undefined ? await auth.getToken() : await auth.getTokenInSession(session);
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (typeof rawBody === "string") {
    body = rawBody;
  } else if (rawBody !== undefined && rawBody !== null) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(rawBody);
  }

  const timeoutSignal = AbortSignal.timeout(API_TIMEOUT_MS);
  const signal =
    callerSignal == null ? timeoutSignal : AbortSignal.any([callerSignal, timeoutSignal]);
  let res: Response;
  let data: unknown;
  try {
    res = await fetch(url, { ...rest, headers, body, signal });
    try {
      data = await res.json();
    } catch (error) {
      // 中断・時間切れは下で案内に変える。JSON でない応答は今までどおり空にする。
      if (isAbortError(error)) throw error;
      data = null;
    }
  } catch (error) {
    if (callerSignal?.aborted !== true && timeoutSignal.aborted && isAbortError(error)) {
      throw new Error(API_TIMEOUT_MESSAGE);
    }
    throw error;
  }

  if (res.status === 401) {
    // 前の世代のトークンが断られただけなら、切り替えたあとの接続を消さない。
    if (session === undefined || session === auth.currentSession()) await auth.clear();
    throw new AuthExpiredError(errorMessage(data, "認証の有効期限が切れました"));
  }

  if (!res.ok) {
    throw new Error(errorMessage(data, `API ${res.status}`));
  }

  return data as T;
}
