/**
 * 認証ラッパ (Cloudflare Workers Google OAuth / JWT)。
 */

import type { ProfileRow, ProfileTenantInfo } from "@falcon/shared/cms/types";

import { apiFetch, ApiClientError } from "./api-client";
import {
  completeAuthFromCallbackHash,
  getAccessToken,
  getSession as readSession,
  isAuthConfigured,
  signInWithGoogle,
  signOut as clearSession,
  subscribeToAuth as onAuthChange,
  type Session,
} from "./auth-client";

export type { Session };
/** /api/me の profile + 所属テナントの表示情報 (取得できた場合のみ)。 */
export type Profile = ProfileRow & { tenant?: ProfileTenantInfo | null };

export { signInWithGoogle, completeAuthFromCallbackHash };

export async function signOut(): Promise<void> {
  await clearSession();
}

export async function getSession(): Promise<Session | null> {
  return readSession();
}

export function subscribeToAuth(callback: (session: Session | null) => void): () => void {
  return onAuthChange(callback);
}

export async function fetchProfile(_userId?: string): Promise<Profile | null> {
  if (!isAuthConfigured() || !getAccessToken()) return null;
  try {
    const { profile, tenant } = await apiFetch<{
      profile: ProfileRow;
      tenant?: ProfileTenantInfo | null;
    }>("/api/me");
    return profile ? { ...profile, tenant: tenant ?? null } : profile;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 403 && err.message === "invite_required") {
      throw err; // 上位で inviteRequired に
    }
    throw err;
  }
}

/**
 * 設定画面からのユーザー名変更。 更新できるのは表示名のみ (ロール / テナント / メールは
 * 招待とログインが真実)。 保存すると以後 Google の登録名では上書きされなくなる。
 */
export async function updateMyDisplayName(displayName: string): Promise<Profile> {
  const { profile } = await apiFetch<{ profile: Profile }>("/api/me", {
    method: "POST",
    body: { display_name: displayName },
  });
  if (!profile) throw new Error("ユーザー名の保存に失敗しました");
  return profile;
}

export { isAuthConfigured, getAccessToken };
