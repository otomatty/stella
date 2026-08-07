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

export function subscribeToAuth(
  callback: (session: Session | null) => void,
): () => void {
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
    if (
      err instanceof ApiClientError &&
      err.status === 403 &&
      err.message === "invite_required"
    ) {
      throw err; // 上位で inviteRequired に
    }
    throw err;
  }
}

export interface EnsureProfileParams {
  userId: string;
  tenantId: string;
  displayName: string;
  email?: string;
  initials?: string;
}

/** 自己更新のみ。招待制のため自由作成オンボーディングからは呼ばない。 */
export async function ensureProfile(
  params: EnsureProfileParams,
): Promise<Profile> {
  const { profile } = await apiFetch<{ profile: Profile }>("/api/me", {
    method: "POST",
    body: {
      tenant_id: params.tenantId,
      display_name: params.displayName,
      ...(params.email ? { email: params.email } : {}),
      ...(params.initials ? { initials: params.initials } : {}),
    },
  });
  if (!profile) throw new Error("プロフィールの作成に失敗しました");
  return profile;
}

export { isAuthConfigured, getAccessToken };
