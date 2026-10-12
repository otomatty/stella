/**
 * Cloudflare Access の検証 (認証は Access に任せ、 アプリは自前の認証を持たない)。
 *
 * Access は保護したホストへのリクエストに、 ログイン済みの利用者のトークン (アプリケーション
 * トークン = Access が署名した JWT) を `Cf-Access-Jwt-Assertion` ヘッダで付けて渡す。
 * Worker はこのヘッダを **必ず署名から検証する** — ヘッダがあることだけを信じると、
 * Access を通らない経路 (別のホスト名・プレビュー URL・将来の設定ミス) から偽のヘッダで
 * 誰にでもなりすませてしまうため。
 *
 *   - 署名: チームドメインの公開鍵 (`https://<team>/cdn-cgi/access/certs`)
 *   - iss: `https://<team>`
 *   - aud: Access アプリケーションの AUD タグ (`ACCESS_AUD`。 カンマ区切りで複数可)
 *
 * 利用者はメールアドレスで識別する (profiles.email と突き合わせる)。 サービストークンの
 * トークンにはメールが無いので受け付けない (人のアカウント以外で API を使わせない)。
 */

import {
  createRemoteJWKSet,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

import type { Env } from "../env.js";

/** Access が付けるヘッダ (Hono の `c.req.header` は大文字小文字を区別しない)。 */
export const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";

export interface AccessConfig {
  /** `https://<team>.cloudflareaccess.com` (末尾スラッシュなし)。 */
  issuer: string;
  certsUrl: string;
  audiences: string[];
}

export interface AccessIdentity {
  /** 小文字に揃えたメールアドレス。 */
  email: string;
  /** Access 上の利用者 ID (ログを追うときの手がかり。 アプリの ID ではない)。 */
  accessUserId: string | null;
  /** トークンの発行時刻 (秒)。 Access のセッションが新しく始まると変わる。 */
  issuedAt: number | null;
  expiresAt: number | null;
  /** Access がトークンに入れた国コード (無ければ null)。 */
  country: string | null;
}

/** `ACCESS_TEAM_DOMAIN` と `ACCESS_AUD` が揃っていれば設定を返す。 片方だけなら null。 */
export function accessConfig(
  env: Pick<Env, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">,
): AccessConfig | null {
  const rawDomain = env.ACCESS_TEAM_DOMAIN?.trim();
  const audiences = (env.ACCESS_AUD ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (!rawDomain || audiences.length === 0) return null;
  const host = rawDomain.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  // ホスト名以外 (パス・ポート・資格情報) が混ざった設定は受け付けない — 鍵の取得先を
  // 取り違えると、 別のチームの鍵で署名したトークンを通してしまう。
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return null;
  const issuer = `https://${host.toLowerCase()}`;
  return { issuer, certsUrl: `${issuer}/cdn-cgi/access/certs`, audiences };
}

/** 鍵の取得はアイソレートごとにキャッシュする (jose が鍵の入れ替えも追う)。 */
const jwksByUrl = new Map<string, JWTVerifyGetKey>();

function jwksFor(certsUrl: string): JWTVerifyGetKey {
  let jwks = jwksByUrl.get(certsUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(certsUrl));
    jwksByUrl.set(certsUrl, jwks);
  }
  return jwks;
}

export class AccessAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessAssertionError";
  }
}

/**
 * Access の公開鍵 (certs) を取れなかった (ネットワーク・時間切れ・200 以外の応答)。トークンが偽物とは
 * 限らないので、拒否 (403) にせず 503 にする。
 */
export class AccessUnavailableError extends Error {
  constructor(
    message = "講師・管理者用の入口の確認 (Cloudflare Access) に失敗しました。しばらくしてからやり直してください",
  ) {
    super(message);
    this.name = "AccessUnavailableError";
  }
}

/** 公開鍵を取りに行けなかった失敗か。署名・発行者・AUD・期限・鍵の不一致は jose の個別のエラーになる。 */
function isKeyFetchFailure(err: unknown): boolean {
  if (!(err instanceof joseErrors.JOSEError)) return true; // fetch の TypeError など
  // 時間切れと、certs が 200 を返さなかったとき (jose は汎用のエラーにする)。
  return err.code === "ERR_JWKS_TIMEOUT" || err.code === "ERR_JOSE_GENERIC";
}

/** 検証済みのペイロードから利用者を取り出す (テストのため検証と分けてある)。 */
export function identityFromAccessPayload(payload: JWTPayload): AccessIdentity {
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    throw new AccessAssertionError("Access のトークンに利用者のメールアドレスがありません");
  }
  const country = typeof payload.country === "string" ? payload.country.toUpperCase() : null;
  return {
    email,
    accessUserId: typeof payload.sub === "string" && payload.sub ? payload.sub : null,
    issuedAt: typeof payload.iat === "number" ? payload.iat : null,
    expiresAt: typeof payload.exp === "number" ? payload.exp : null,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
  };
}

/**
 * `Cf-Access-Jwt-Assertion` を検証して利用者を返す。 署名・発行者・AUD・期限のどれかが
 * 合わなければ `AccessAssertionError` を投げる。
 */
export async function verifyAccessAssertion(
  config: AccessConfig,
  token: string,
  jwks: JWTVerifyGetKey = jwksFor(config.certsUrl),
): Promise<AccessIdentity> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: config.audiences,
      algorithms: ["RS256"],
    }));
  } catch (err) {
    if (isKeyFetchFailure(err)) throw new AccessUnavailableError();
    throw new AccessAssertionError("Access のトークンを検証できませんでした");
  }
  return identityFromAccessPayload(payload);
}
