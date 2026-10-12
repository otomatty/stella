/**
 * 利用者のセッションの失効 (管理画面の「セッションを失効」とアカウントの無効化)。
 *
 *   - Clerk … 利用者のセッションと VS Code の API キーを全部取り消す (STELLA の Clerk アプリだけに効く)
 *   - Cloudflare Access … 講師・管理者・営業は、講師・管理者用の入口の Access のセッションも切る
 *     (Access の失効は組織単位で、同じ Cloudflare アカウントの他の Access アプリにも効く)
 */

import type { Env } from "../env.js";
import { STAFF_HOST_ROLES } from "./authz.js";
import { clerkConfig, revokeClerkUser } from "./clerk-auth.js";
import { cloudflareAccessApiConfigured, revokeAccessSessions } from "./security-cloudflare.js";

type RevokeEnv = Parameters<typeof clerkConfig>[0] & Parameters<typeof revokeAccessSessions>[0];

/** どちらかで失効できるか (どちらも無ければ画面の失効ボタンは使えない)。 */
export function sessionRevokeConfigured(env: RevokeEnv): boolean {
  return clerkConfig(env) !== null || cloudflareAccessApiConfigured(env);
}

export interface RevokeResult {
  clerk: boolean;
  access: boolean;
}

/**
 * 利用者のセッションを失効する。設定の無い側は飛ばす。失敗は例外 (途中まで失効していることはある)。
 */
export async function revokeUserSessions(
  env: RevokeEnv & Pick<Env, "CLERK_SECRET_KEY">,
  target: { email: string; role: string },
  fetchImpl: typeof fetch = fetch,
): Promise<RevokeResult> {
  const clerk = clerkConfig(env);
  const result: RevokeResult = { clerk: false, access: false };
  if (clerk) result.clerk = await revokeClerkUser(clerk, target.email);
  if (STAFF_HOST_ROLES.has(target.role) && cloudflareAccessApiConfigured(env)) {
    result.access = await revokeAccessSessions(env, target.email, fetchImpl);
  }
  return result;
}
