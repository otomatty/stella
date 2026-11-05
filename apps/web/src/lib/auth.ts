/**
 * 認証ラッパ (Better Auth の Google ログイン、Issue #117)。
 */

import type { ProfileRow } from "@stella/shared/cms/types";

import { apiFetch, ApiClientError } from "./api-client";
import {
  completeLogin,
  getAccessToken,
  getSession as cachedSession,
  isAuthConfigured,
  loadSession,
  signInWithGoogle,
  signOut as clearSession,
  subscribeToAuth as onAuthChange,
  type Session,
} from "./auth-client";

export type { Session };
/** /api/me の profile。応答の tenant は開いたままの古いタブ用なので読まない。 */
export type Profile = ProfileRow;

export { signInWithGoogle, completeLogin };

export async function signOut(): Promise<void> {
  await clearSession();
}

/** Reads the session from the server (the cookie is HttpOnly, so the page cannot see it). */
export async function getSession(): Promise<Session | null> {
  return loadSession();
}

export function subscribeToAuth(callback: (session: Session | null) => void): () => void {
  return onAuthChange(callback);
}

export async function fetchProfile(_userId?: string): Promise<Profile | null> {
  if (!isAuthConfigured() || !cachedSession()) return null;
  try {
    const { profile } = await apiFetch<{ profile: ProfileRow }>("/api/me");
    return profile ?? null;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 403 && err.message === "invite_required") {
      throw err; // 上位で inviteRequired に
    }
    throw err;
  }
}

/**
 * 設定画面からのユーザー名変更。 更新できるのは表示名のみ (ロール / メールは
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
