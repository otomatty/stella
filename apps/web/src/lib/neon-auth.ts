/**
 * Neon Auth クライアント (旧 Supabase Auth Magic Link の置き換え)。
 *
 * 役割を 1 箇所に集約する:
 *   - Magic Link / Email OTP のサインイン要求
 *   - セッション (アクセストークン) の永続化と購読
 *   - `getAccessToken()` … api-client が Authorization: Bearer に載せるトークンを返す
 *
 * 実装方針:
 *   Neon Auth (Better Auth ベース) は JWT を発行する。 本クライアントはその JWT を
 *   localStorage に保持し、 サーバ (Hono) 側は JWKS で検証する (apps/api/src/lib/authz.ts)。
 *   Magic Link 送信とトークン発行は Neon Auth のエンドポイントに委譲する。 エンドポイントの
 *   ベース URL は `VITE_NEON_AUTH_URL` で設定する (Neon Console → Auth で確認できる)。
 *
 * NOTE: 実運用では Neon Auth の公式 React SDK に置き換えられる。 その場合も本ファイルの
 *       公開インターフェース (signInWithEmail / getSession / subscribeToAuth /
 *       getAccessToken / signOut) を保てば、 利用側 (api-client, auth.ts) は無変更で済む。
 */

const TOKEN_KEY = "neon_auth_token_v1";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

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
  return Boolean(authUrl);
}

/** JWT の payload を検証なしでデコードする (中身の参照用。 真正性検証はサーバ側)。 */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    // base64url → base64 へ変換し、 atob が要求する 4 の倍数長へパディングする。
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
  // 失効済みトークンはセッションなしとみなす。
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

/**
 * Magic Link / リダイレクト経由で URL に載って戻ってきたトークンを取り込む。
 * `#access_token=...` または `?access_token=...` を拾い、 取り込んだら URL から除去する。
 */
function captureTokenFromUrl(): void {
  if (typeof window === "undefined") return;
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromQuery = new URLSearchParams(window.location.search);
  const token = fromHash.get("access_token") ?? fromQuery.get("access_token");
  if (token) {
    storeToken(token);
    fromHash.delete("access_token");
    fromQuery.delete("access_token");
    const hash = fromHash.toString();
    const query = fromQuery.toString();
    const url =
      window.location.pathname +
      (query ? `?${query}` : "") +
      (hash ? `#${hash}` : "");
    window.history.replaceState({}, "", url);
  }
}

/** Magic Link メールの送信を Neon Auth に要求する。 */
export async function signInWithEmail(email: string): Promise<void> {
  if (!authUrl) throw new Error("Neon Auth が未設定のため Magic Link を送信できません");
  const redirect = typeof window !== "undefined" ? window.location.origin : undefined;
  const res = await fetch(`${authUrl.replace(/\/$/, "")}/magic-link/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...(redirect ? { callbackUrl: redirect } : {}) }),
  });
  if (!res.ok) {
    throw new Error(`Magic Link の送信に失敗しました (${res.status})`);
  }
}

export async function signOut(): Promise<void> {
  storeToken(null);
}

export function getAccessToken(): string | null {
  const token = readToken();
  if (!token) return null;
  // 失効済みは破棄する。
  if (!sessionFromToken(token)) {
    storeToken(null);
    return null;
  }
  return token;
}

export function getSession(): Session | null {
  if (typeof window !== "undefined") captureTokenFromUrl();
  const token = readToken();
  if (!token) return null;
  const session = sessionFromToken(token);
  if (!session) {
    storeToken(null);
    return null;
  }
  return session;
}

/** セッション変化 (サインイン / アウト / 別タブの変更) を購読する。 */
export function subscribeToAuth(callback: Listener): () => void {
  listeners.add(callback);
  // 別タブでの localStorage 変更を反映する。
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) callback(e.newValue ? sessionFromToken(e.newValue) : null);
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
