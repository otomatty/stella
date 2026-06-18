/**
 * 認証ラッパ (Cloudflare Workers Google OAuth / JWT)。
 */

import type { ProfileRow } from "@falcon/shared/cms/types";

import { apiFetch } from "./api-client";
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
export type Profile = ProfileRow;

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
  const { profile } = await apiFetch<{ profile: Profile | null }>("/api/me");
  return profile;
}

export interface EnsureProfileParams {
  userId: string;
  tenantId: string;
  displayName: string;
  email?: string;
  initials?: string;
}

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
