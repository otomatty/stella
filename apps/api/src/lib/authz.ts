/**
 * 認証 (Clerk のトークン検証) と認可 (テナント / ロール) のアプリ層ヘルパ。
 *
 *   - `resolveIdentity`   … 誰のリクエストか。本番は Clerk のセッショントークン (画面) か、
 *                           アプリが発行した Clerk の API キー (VS Code) を検証してメールアドレスで決める。
 *                           Clerk の無いローカル開発とテストだけ、開発用の Bearer トークンを読む
 *   - `getCaller`         … 利用者 → profiles から caller の tenant / role を解決
 *   - `assertStaffAccess` … 講師・管理者・営業は、Cloudflare Access で守った講師・管理者用の入口を
 *                           通ったリクエスト (`Cf-Access-Jwt-Assertion` が同じメールアドレス) に限る
 *   - `requireRole`       … caller が指定ロールのいずれかであることを保証
 *
 * アプリはパスワードも OAuth も持たない。ログイン・確認コード・セッションの失効は Clerk の、
 * 講師・管理者の多要素認証は Access の仕事で、ここはトークンを確かめて招待済みの利用者に結び付けるだけ。
 */

import { eq, sql, type SQL } from "drizzle-orm";
import type { Context } from "hono";

import type { Db } from "../db/client.js";
import { getDb } from "../db/client.js";
import { profiles, tenants } from "../db/schema.js";
import type { Env } from "../env.js";
import { ACCESS_ASSERTION_HEADER, accessConfig, verifyAccessAssertion } from "./access-auth.js";
import { verifyAccessToken } from "./auth-jwt.js";
import {
  clerkConfig,
  ClerkUnavailableError,
  isClerkApiKey,
  verifyClerkSession,
  verifyVscodeApiKey,
} from "./clerk-auth.js";
import {
  deferSecurityEvent,
  markRequestActor,
  markRequestRecorded,
  trackSession,
} from "./security-events.js";

export class ApiError extends Error {
  // 410 は「あった機能を廃止した」ぶんだけ (Phase 3b の割当 API)。404 だと呼び出し側が
  // 綴り違いを疑って探し回るので、退役したことが伝わる番号を使う。
  status: 400 | 401 | 403 | 404 | 409 | 410 | 429 | 500 | 502 | 503;
  constructor(message: string, status: ApiError["status"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** `.returning()` が空だったときに 500 にする。呼び出し側の `rows[0]!` を避ける。 */
export function requireReturning<T>(rows: readonly T[], what: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new ApiError(`${what} が行を返しませんでした`, 500);
  }
  return row;
}

export type ProfileRole = "student" | "instructor" | "admin" | "platform_admin" | "sales";

export interface Caller {
  id: string;
  tenantId: string;
  role: ProfileRole;
  name: string;
  email: string | null;
}

/** 検証済みの利用者。`sessionKey` が変わったら新しいサインインとして記録する。 */
export type Identity =
  | {
      /** 画面 (Clerk のセッショントークン)。 */
      kind: "clerk";
      /** 小文字のメールアドレス。profiles.email と突き合わせる。 */
      email: string;
      clerkUserId: string;
      sessionKey: string;
    }
  | {
      /** VS Code の拡張 (アプリが発行した Clerk の API キー)。 */
      kind: "clerk_api_key";
      email: string;
      clerkUserId: string;
      apiKeyId: string;
      sessionKey: string;
    }
  | {
      kind: "dev";
      /** 開発用トークンの sub (= profiles.id)。 */
      profileId: string;
      email: string | null;
      sessionKey: string | null;
    };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** ローカル開発 (wrangler dev) とテスト (`app.request`) のリクエストか。 */
export function isLocalRequest(c: Context<{ Bindings: Env }>): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(c.req.url).hostname);
  } catch {
    return false;
  }
}

function bearerToken(c: Context<{ Bindings: Env }>): string {
  return (c.req.header("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

/**
 * 誰のリクエストかを決める。
 *
 * - Clerk が設定済み (`CLERK_SECRET_KEY`) … `Authorization: Bearer` の Clerk のセッショントークン
 *   (画面) か、アプリが発行した Clerk の API キー (VS Code) だけを受け付ける (開発用トークンを
 *   本番で通さない)。
 * - Clerk が未設定 … ローカル (localhost / 127.0.0.1) かつ `DEV_AUTH_JWT_SECRET` があるときだけ、
 *   開発用の Bearer トークンを読む。それ以外は 503 (認証の無いまま動かさない)。
 */
export async function resolveIdentity(c: Context<{ Bindings: Env }>): Promise<Identity> {
  const clerk = clerkConfig(c.env);
  if (clerk) {
    const token = bearerToken(c);
    if (!token) {
      deferSecurityEvent(c, {
        kind: "auth.invalid_token",
        status: 401,
        metadata: { reason: "missing" },
      });
      markRequestRecorded(c);
      throw new ApiError("ログインが必要です", 401);
    }
    try {
      if (isClerkApiKey(token)) {
        const key = await verifyVscodeApiKey(clerk, token);
        return {
          kind: "clerk_api_key",
          email: key.email,
          clerkUserId: key.userId,
          apiKeyId: key.apiKeyId,
          sessionKey: `api_key:${key.apiKeyId}`,
        };
      }
      const session = await verifyClerkSession(clerk, token);
      return {
        kind: "clerk",
        email: session.email,
        clerkUserId: session.userId,
        sessionKey: `clerk:${session.sessionId}`,
      };
    } catch (err) {
      if (err instanceof ClerkUnavailableError) throw new ApiError(err.message, 503);
      deferSecurityEvent(c, {
        kind: "auth.invalid_token",
        status: 401,
        metadata: { reason: "invalid" },
      });
      markRequestRecorded(c);
      throw new ApiError("ログインの有効期限が切れました。ログインし直してください", 401);
    }
  }

  const devSecret = c.env.DEV_AUTH_JWT_SECRET;
  if (devSecret && isLocalRequest(c)) {
    const token = bearerToken(c);
    if (!token) throw new ApiError("Authorization ヘッダが必要です", 401);
    try {
      const payload = await verifyAccessToken(devSecret, token);
      return {
        kind: "dev",
        profileId: payload.sub as string,
        email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
        sessionKey: typeof payload.iat === "number" ? `dev:${payload.iat}` : null,
      };
    } catch {
      throw new ApiError("トークンが無効です", 401);
    }
  }

  throw new ApiError("認証が未設定です (CLERK_SECRET_KEY)", 503);
}

/** 講師・管理者用の入口 (Cloudflare Access で守ったホスト名) を通らなければならないロール。 */
export const STAFF_HOST_ROLES: ReadonlySet<string> = new Set([
  "instructor",
  "admin",
  "platform_admin",
  "sales",
]);

/** 講師・管理者用の入口を通っていないときの 403 の本文 (画面が案内を出す)。 */
export const STAFF_HOST_REQUIRED = "staff_host_required";

/**
 * 講師・管理者・営業のリクエストは、Cloudflare Access で守った講師・管理者用の入口を通ったもの
 * (`Cf-Access-Jwt-Assertion` を署名から検証し、Clerk の利用者と同じメールアドレス) に限る。
 * Access の多要素認証を重ねるため (Clerk のアカウントだけを奪っても、講師・管理者の操作はできない)。
 * VS Code の API キーでは講師・管理者のアカウントを使わせない。Access の設定が無いときに通すのは
 * ローカル開発 (localhost) だけで、それ以外は設定の誤りとして止める (Clerk だけで講師・管理者の操作を
 * させない。設定を戻したときなどに、受講者用の入口から講師・管理者として操作できてしまうため)。
 */
export async function assertStaffAccess(
  c: Context<{ Bindings: Env }>,
  profile: { id: string; tenantId: string; role: string; email: string | null },
  identity: Identity,
): Promise<void> {
  if (!STAFF_HOST_ROLES.has(profile.role) || identity.kind === "dev") return;
  const reject = (reason: string, message: string, status: 403 | 503 = 403): never => {
    deferSecurityEvent(c, {
      kind: "auth.staff_host_required",
      status,
      tenantId: profile.tenantId,
      actorId: profile.id,
      actorRole: profile.role,
      email: profile.email,
      metadata: { reason },
    });
    markRequestRecorded(c);
    throw new ApiError(message, status);
  };
  if (identity.kind === "clerk_api_key") {
    reject("api_key", "講師・管理者のアカウントは VS Code の接続では使えません");
  }
  const access = accessConfig(c.env);
  if (!access) {
    if (isLocalRequest(c)) return;
    return reject(
      "access_unconfigured",
      "講師・管理者用の入口の設定 (ACCESS_TEAM_DOMAIN / ACCESS_AUD) がありません。管理者に連絡してください",
      503,
    );
  }
  const assertion = c.req.header(ACCESS_ASSERTION_HEADER)?.trim();
  if (!assertion) reject("missing", STAFF_HOST_REQUIRED);
  const verified = await verifyAccessAssertion(access, assertion ?? "").catch(() => null);
  if (!verified) reject("invalid", STAFF_HOST_REQUIRED);
  if (verified?.email !== (profile.email ?? "").toLowerCase()) {
    reject("email_mismatch", STAFF_HOST_REQUIRED);
  }
}

/** 利用者に当たる profiles 行の条件 (Clerk はメールアドレス、開発用は profiles.id)。 */
export function profileMatch(identity: Identity): SQL {
  return identity.kind === "dev"
    ? eq(profiles.id, identity.profileId)
    : sql`lower(${profiles.email}) = ${identity.email}`;
}

/** 招待されていない利用者のアクセスを記録する (Clerk に登録しただけの人・招待漏れ)。 */
export function recordUninvited(c: Context<{ Bindings: Env }>, identity: Identity): void {
  deferSecurityEvent(c, {
    kind: "auth.no_profile",
    status: 403,
    email: identity.email,
  });
  markRequestRecorded(c);
}

/** 無効化済みのアカウントのアクセスを記録する。 */
export function recordDisabled(
  c: Context<{ Bindings: Env }>,
  profile: { id: string; tenantId: string; role: string; email: string | null },
): void {
  deferSecurityEvent(c, {
    kind: "auth.disabled",
    status: 403,
    tenantId: profile.tenantId,
    actorId: profile.id,
    actorRole: profile.role,
    email: profile.email,
  });
  markRequestRecorded(c);
}

/**
 * 利用停止中の組織 (tenants.active = 0) の利用者を拒否して記録する。platform_admin は除く
 * (組織を戻す操作ができなくならないように)。`tenantActive` が null (組織の行が無い) なら通す。
 */
export function assertTenantActive(
  c: Context<{ Bindings: Env }>,
  profile: {
    id: string;
    tenantId: string;
    role: string;
    email: string | null;
    tenantActive: boolean | null;
  },
): void {
  if (profile.tenantActive !== false || profile.role === "platform_admin") return;
  deferSecurityEvent(c, {
    kind: "auth.tenant_inactive",
    status: 403,
    tenantId: profile.tenantId,
    actorId: profile.id,
    actorRole: profile.role,
    email: profile.email,
  });
  markRequestRecorded(c);
  throw new ApiError("所属する組織は利用停止中です", 403);
}

/**
 * 利用者を検証し、 profiles から caller のテナント / ロールを解決する。
 * 無効化済みアカウントと、利用停止中の組織 (tenants.active = 0。platform_admin を除く) は拒否する。
 */
export async function getCaller(c: Context<{ Bindings: Env }>): Promise<{
  caller: Caller;
  db: Db;
  identity: Identity;
}> {
  const identity = await resolveIdentity(c);
  const db = getDb(c.env);

  const rows = await db
    .select({
      id: profiles.id,
      tenantId: profiles.tenantId,
      role: profiles.role,
      displayName: profiles.displayName,
      email: profiles.email,
      disabled: profiles.disabled,
      tenantActive: tenants.active,
    })
    .from(profiles)
    .leftJoin(tenants, eq(profiles.tenantId, tenants.id))
    .where(profileMatch(identity))
    .limit(1);

  const profile = rows[0];
  if (!profile) {
    recordUninvited(c, identity);
    throw new ApiError("プロフィールが見つかりません", 403);
  }
  if (profile.disabled) {
    recordDisabled(c, profile);
    throw new ApiError("このアカウントは無効化されています", 403);
  }
  assertTenantActive(c, profile);
  await assertStaffAccess(c, profile, identity);

  const caller: Caller = {
    id: profile.id,
    tenantId: profile.tenantId,
    role: profile.role as ProfileRole,
    name: profile.displayName,
    email: profile.email,
  };
  const actor = {
    id: caller.id,
    tenantId: caller.tenantId,
    role: caller.role,
    email: caller.email,
  };
  markRequestActor(c, actor);
  trackSession(c, actor, identity.sessionKey);
  return { db, caller, identity };
}

/** caller が指定ロールのいずれかでなければ 403 を投げる。 */
export function requireRole(caller: Caller, ...roles: ProfileRole[]): void {
  if (!roles.includes(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

export function isStaffRole(role: ProfileRole): boolean {
  return role === "instructor" || role === "admin" || role === "platform_admin";
}

/** 面談対策の割当・準備状況の閲覧。 staff 機能 (CMS 等) とは別枠 — sales を含む。 */
export function canManageInterviewPrep(role: ProfileRole): boolean {
  return isStaffRole(role) || role === "sales";
}

export function requireCanManageInterviewPrep(caller: Caller): void {
  if (!canManageInterviewPrep(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/** 専用ステージ (`audience = granted`) の割当。講師・管理者のみ (営業は対象外)。 */
export function requireCanManageStageGrants(caller: Caller): void {
  if (!isStaffRole(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/**
 * 面談対策を「受ける」側になれるロール (受講者 / 管理者)。 管理者は受講者と同じ
 * 練習 (割当・今日の練習セット・進捗・改善点メモ) ができる。 講師・営業は対象外。
 * UI 側の双子は `@stella/shared/admin/types` の同名関数。
 */
export const INTERVIEW_PREP_PRACTICE_ROLES: ProfileRole[] = ["student", "admin", "platform_admin"];

export function canPracticeInterviewPrep(role: ProfileRole): boolean {
  return INTERVIEW_PREP_PRACTICE_ROLES.includes(role);
}

/** 面談対策の練習系 API (自分の進捗を書く操作) の入口ガード。 */
export function requireCanPracticeInterviewPrep(caller: Caller): void {
  if (!canPracticeInterviewPrep(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/**
 * 腕試し (SkillCheck / 飛び級) を **受ける** 側になれるロール (Phase 3a)。
 *
 * `INTERVIEW_PREP_PRACTICE_ROLES` と同じ流儀・同じ顔ぶれ。管理者は運用の当事者として
 * 受講者と同じ腕試しを試せる必要がある (出題や合格ラインの手触りを確かめる場が他に
 * 無い) 一方、講師・営業は対象外 — 飛び級は「自分の星を開ける」操作で、他人の学習を
 * 見る側のロールが自分の `stage_unlocks` を作っても意味が無く、受験履歴だけが増える。
 */
export const SKILL_CHECK_ROLES: ProfileRole[] = ["student", "admin", "platform_admin"];

export function canTakeSkillCheck(role: ProfileRole): boolean {
  return SKILL_CHECK_ROLES.includes(role);
}

/** 腕試し API (出題・採点の両方) の入口ガード。 */
export function requireCanTakeSkillCheck(caller: Caller): void {
  if (!canTakeSkillCheck(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/**
 * ステージの自己開始 (`POST /api/stages/:id/start`) の入口ガード (Phase 3b)。
 *
 * 顔ぶれは腕試しと同じ (`SKILL_CHECK_ROLES`) — 飛び級で開いた星の自己登録と自己開始は
 * 同じ「自分の学習を自分で始める」操作なので、片方だけ講師・営業に開けると
 * 「受けられないのに始められる」がねじれる。
 */
export function requireCanStartStage(caller: Caller): void {
  if (!canTakeSkillCheck(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/** 面談予定日・メモの write。 instructor は categories のみ。 */
export function canWriteInterviewSchedule(role: ProfileRole): boolean {
  return role === "sales" || role === "admin" || role === "platform_admin";
}

/**
 * 想定質問そのものの編集 (Issue #237)。 面談に同席して質問の実際の言い回しを
 * 知っているのは営業なので、 admin と同じく編集できる。 instructor は割当と
 * モニタリングのみで、 全受講者に効く質問バンクは触らせない。
 */
export function canEditInterviewQuestions(role: ProfileRole): boolean {
  return role === "sales" || role === "admin" || role === "platform_admin";
}

export function requireCanEditInterviewQuestions(caller: Caller): void {
  if (!canEditInterviewQuestions(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

export function requireTenantAdmin(caller: Caller): void {
  requireRole(caller, "admin", "platform_admin");
}

export function requirePlatformAdmin(caller: Caller): void {
  requireRole(caller, "platform_admin");
}

/** ApiError を Hono レスポンスへ。 想定外エラーは 500 に丸める。 */
export function errorResponse(c: Context, err: unknown): Response {
  if (err instanceof ApiError) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[api] unexpected error", err);
  return c.json({ error: "内部エラーが発生しました" }, 500);
}
