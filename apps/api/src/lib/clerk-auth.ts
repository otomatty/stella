/**
 * Clerk の検証 (ログイン・確認コード・Google でのログイン・セッションの失効は Clerk に任せ、
 * アプリは自前の認証を持たない)。
 *
 *   - 画面 … Clerk のセッショントークン (約 60 秒で切れ、画面の SDK が更新し続ける JWT) を
 *     `Authorization: Bearer` で送る。署名 (Clerk の鍵)・期限・`azp` (発行元の画面のオリジン) を
 *     確かめ、メールアドレス (セッショントークンに足した `email` クレーム) で招待済みの profiles に結び付ける。
 *   - VS Code の拡張 … 画面の SDK を持たないので、接続コードの交換で発行した Clerk の API キー
 *     (利用者ごと・30 日で期限切れ・取り消し可) を送る。アプリが発行したキー (スコープ
 *     `stella:vscode` とクレームを持つもの) だけを受け付ける。
 *
 * どちらもメールアドレスで識別する。Clerk の利用者 ID は失効の操作で使う。
 */

import { createClerkClient, verifyToken } from "@clerk/backend";

import type { Env } from "../env.js";

/** アプリが VS Code の接続で発行する API キーのスコープ。これの無いキーは受け付けない。 */
export const VSCODE_API_KEY_SCOPE = "stella:vscode";
/** VS Code の API キーの有効期間 (切れたら Web の「VS Code で開く」から接続し直す)。 */
export const VSCODE_API_KEY_TTL_SECONDS = 30 * 24 * 60 * 60;
/** Clerk の API キーの接頭辞 (セッショントークン = JWT と見分ける)。 */
const API_KEY_PREFIX = "ak_";

export interface ClerkConfig {
  secretKey: string;
  jwtKey: string | null;
  /** セッショントークンの `azp` として認めるオリジン。 */
  authorizedParties: string[];
}

export interface ClerkSessionIdentity {
  /** 小文字のメールアドレス。 */
  email: string;
  userId: string;
  sessionId: string;
  issuedAt: number | null;
  expiresAt: number | null;
}

export interface ClerkApiKeyIdentity {
  email: string;
  userId: string;
  apiKeyId: string;
}

export class ClerkTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClerkTokenError";
  }
}

/**
 * Clerk に確かめられなかった (ネットワーク・Clerk の障害・回数制限)。トークンが無効とは限らないので、
 * 401 (拡張はキーを消す) にせず 503 にする。
 */
export class ClerkUnavailableError extends Error {
  constructor(message = "Clerk に接続できませんでした。しばらくしてからやり直してください") {
    super(message);
    this.name = "ClerkUnavailableError";
  }
}

/** Clerk がトークンを拒否した (4xx。回数制限の 429 を除く) か。それ以外の失敗は障害として扱う。 */
function isClerkRejection(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 429;
}

function origins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => /^https?:\/\/[^/*]+$/i.test(o));
}

/** `CLERK_SECRET_KEY` があれば設定を返す。 */
export function clerkConfig(
  env: Pick<
    Env,
    | "CLERK_SECRET_KEY"
    | "CLERK_JWT_KEY"
    | "CLERK_AUTHORIZED_PARTIES"
    | "ALLOWED_ORIGINS"
    | "STAFF_ORIGIN"
  >,
): ClerkConfig | null {
  const secretKey = env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return null;
  const explicit = origins(env.CLERK_AUTHORIZED_PARTIES);
  const authorizedParties =
    explicit.length > 0
      ? explicit
      : [...new Set([...origins(env.ALLOWED_ORIGINS), ...origins(env.STAFF_ORIGIN)])];
  return {
    secretKey,
    jwtKey: env.CLERK_JWT_KEY?.trim() || null,
    authorizedParties,
  };
}

/** Clerk の API キーか (それ以外はセッショントークンとして扱う)。 */
export function isClerkApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

/**
 * セッショントークンを検証する。発行元の画面 (`azp`) が認めたオリジンでなければ拒否する
 * (別のサイトに埋め込まれた Clerk の画面で作られたトークンを通さない)。
 */
export async function verifyClerkSession(
  config: ClerkConfig,
  token: string,
): Promise<ClerkSessionIdentity> {
  if (config.authorizedParties.length === 0) {
    throw new ClerkTokenError("Clerk の発行元のオリジンが設定されていません");
  }
  const result: unknown = await verifyToken(token, {
    ...(config.jwtKey ? { jwtKey: config.jwtKey } : { secretKey: config.secretKey }),
    authorizedParties: config.authorizedParties,
  }).catch((err: unknown) => {
    // 公開鍵 (JWKS) を Clerk から取れなかったときだけ障害。それ以外 (期限切れ・署名・azp) は拒否。
    if ((err as { reason?: unknown } | null)?.reason === "jwk-remote-failed-to-load") {
      throw new ClerkUnavailableError();
    }
    return null;
  });
  // 型は `{ data } | { errors }` だが、版によってはクレームそのものを返し、失敗は例外にする。両方を受ける。
  const returnedErrors =
    result && typeof result === "object" && "errors" in result
      ? (result as { errors?: unknown }).errors
      : null;
  if (
    Array.isArray(returnedErrors) &&
    returnedErrors.some(
      (e) => (e as { reason?: unknown } | null)?.reason === "jwk-remote-failed-to-load",
    )
  ) {
    throw new ClerkUnavailableError();
  }
  const unwrapped =
    result && typeof result === "object" && ("data" in result || "errors" in result)
      ? (result as { data?: unknown }).data
      : result;
  const payload =
    unwrapped && typeof unwrapped === "object" ? (unwrapped as Record<string, unknown>) : null;
  if (!payload) throw new ClerkTokenError("Clerk のセッショントークンを検証できませんでした");
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const sid = typeof payload.sid === "string" ? payload.sid : "";
  // azp の無いトークン (画面以外で作られたもの) は受け付けない。
  if (!sub || !sid || typeof payload.azp !== "string") {
    throw new ClerkTokenError("Clerk のセッショントークンの形が違います");
  }
  const rawEmail = payload.email;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    // Clerk の Sessions → Customize session token に `"email": "{{user.primary_email_address}}"` が要る。
    throw new ClerkTokenError("Clerk のセッショントークンにメールアドレスがありません");
  }
  return {
    email,
    userId: sub,
    sessionId: sid,
    issuedAt: typeof payload.iat === "number" ? payload.iat : null,
    expiresAt: typeof payload.exp === "number" ? payload.exp : null,
  };
}

function clerkClient(config: ClerkConfig) {
  return createClerkClient({ secretKey: config.secretKey });
}

/** 確かめた API キーを少しの間覚える (リクエストごとに Clerk へ問い合わせないため)。 */
const API_KEY_CACHE_MS = 60_000;
const apiKeyCache = new Map<string, { identity: ClerkApiKeyIdentity; at: number }>();

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** テスト用。 */
export function resetClerkApiKeyCache(): void {
  apiKeyCache.clear();
}

/**
 * VS Code の拡張が送る API キーを Clerk で確かめる。アプリが発行したキー (スコープと
 * クレームを持つもの) でなければ拒否する — 利用者が Clerk の画面で作ったキーでは入れない。
 */
export async function verifyVscodeApiKey(
  config: ClerkConfig,
  secret: string,
  now = Date.now(),
): Promise<ClerkApiKeyIdentity> {
  const cacheKey = await sha256(secret);
  const cached = apiKeyCache.get(cacheKey);
  if (cached && now - cached.at < API_KEY_CACHE_MS) return cached.identity;
  const key = await clerkClient(config)
    .apiKeys.verify(secret)
    .catch((err: unknown) => {
      // 障害・回数制限でキーを無効と答えると、拡張がキーを消して全員が接続し直すことになる。
      if (!isClerkRejection(err)) throw new ClerkUnavailableError();
      return null;
    });
  const claims = (key?.claims ?? {}) as Record<string, unknown>;
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (
    !key ||
    key.revoked ||
    key.expired ||
    !key.subject.startsWith("user_") ||
    !key.scopes.includes(VSCODE_API_KEY_SCOPE) ||
    !email.includes("@")
  ) {
    throw new ClerkTokenError("VS Code の接続が無効です");
  }
  const identity = { email, userId: key.subject, apiKeyId: key.id };
  if (apiKeyCache.size >= 1000) apiKeyCache.clear();
  apiKeyCache.set(cacheKey, { identity, at: now });
  return identity;
}

/** VS Code の接続用の API キーを発行する。秘密の値は発行時にしか取れない。 */
export async function createVscodeApiKey(
  config: ClerkConfig,
  args: { clerkUserId: string; email: string; profileId: string },
): Promise<string> {
  const key = await clerkClient(config).apiKeys.create({
    name: "STELLA VS Code",
    subject: args.clerkUserId,
    scopes: [VSCODE_API_KEY_SCOPE],
    claims: { email: args.email.toLowerCase(), profile_id: args.profileId },
    secondsUntilExpiration: VSCODE_API_KEY_TTL_SECONDS,
  });
  if (!key.secret) throw new Error("Clerk が API キーの値を返しませんでした");
  return key.secret;
}

const LIST_PAGE_SIZE = 100;

/**
 * 一覧を最後のページまで読む。取り消す前に全部を集める (取り消しながら offset を進めると、
 * 有効なものだけを返す一覧が詰まって読み飛ばすため)。
 */
async function listAllPages<T>(
  fetchPage: (page: { limit: number; offset: number }) => Promise<{ data: T[] }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data } = await fetchPage({ limit: LIST_PAGE_SIZE, offset });
    all.push(...data);
    if (data.length < LIST_PAGE_SIZE) return all;
  }
}

/**
 * 利用者の Clerk のセッションと VS Code の API キーを全部取り消す (無効化・管理画面の失効)。
 * 利用者が Clerk に居なければ false。失敗は例外。
 */
export async function revokeClerkUser(config: ClerkConfig, email: string): Promise<boolean> {
  const client = clerkClient(config);
  const users = await client.users.getUserList({ emailAddress: [email.toLowerCase()], limit: 10 });
  if (users.data.length === 0) return false;
  for (const user of users.data) {
    const sessions = await listAllPages((page) =>
      client.sessions.getSessionList({ userId: user.id, status: "active", ...page }),
    );
    for (const session of sessions) await client.sessions.revokeSession(session.id);
    // 接続のたびにキーを作るので、1 ページ (100 件) に収まるとは限らない。
    const keys = await listAllPages((page) => client.apiKeys.list({ subject: user.id, ...page }));
    for (const key of keys) {
      if (!key.revoked && key.scopes.includes(VSCODE_API_KEY_SCOPE)) {
        await client.apiKeys.revoke({ apiKeyId: key.id, revocationReason: "stella-revoke" });
      }
    }
  }
  apiKeyCache.clear();
  return true;
}
