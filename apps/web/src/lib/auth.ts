/**
 * 認証ラッパ (Neon Auth Magic Link / 旧 Supabase Auth の置き換え)。
 *
 * - `signInWithEmail(email)` で Magic Link を送る
 * - `onAuthStateChange` 相当を `subscribeToAuth` で集約する
 * - `fetchProfile` / `ensureProfile` は Hono API (`/api/me`) 経由で profiles を読み書きする
 *
 * 公開インターフェースは旧実装と互換に保ち、 利用側 (useAuthSession 等) を変えずに
 * バックエンドだけ差し替えられるようにしている。
 */

import type { ProfileRow } from "@falcon/shared/cms/types";

import { apiFetch } from "./api-client";
import {
  getAccessToken,
  getSession as getNeonSession,
  isAuthConfigured,
  signInWithEmail as neonSignIn,
  signOut as neonSignOut,
  subscribeToAuth as neonSubscribe,
  type Session,
} from "./neon-auth";

export type { Session };
export type Profile = ProfileRow;

export async function signInWithEmail(email: string): Promise<void> {
  return neonSignIn(email);
}

export async function signOut(): Promise<void> {
  return neonSignOut();
}

export async function getSession(): Promise<Session | null> {
  return getNeonSession();
}

export function subscribeToAuth(
  callback: (session: Session | null) => void,
): () => void {
  return neonSubscribe(callback);
}

/** caller 自身のプロフィールを取得する (引数 userId は互換のため受けるが未使用)。 */
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
