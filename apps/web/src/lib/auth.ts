/**
 * Supabase Auth (Magic Link) ラッパ。
 *
 * - `signInWithEmail(email)` で OTP メールを送る
 * - `onAuthStateChange` のサブスクリプションを集約する
 * - `fetchProfile` / `ensureProfile` で `profiles` テーブルとの紐付けを管理する
 *
 * 既存の fixtures ベースのフローは Supabase 未設定時の dev fallback として残す。
 * (`isSupabaseConfigured()` ゲートで利用側が分岐する)
 */

import type { Session } from "@supabase/supabase-js";
import type { ProfileRow } from "@falcon/shared/cms/types";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export type { Session };
export type Profile = ProfileRow;

export async function signInWithEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase が未設定のため Magic Link を送信できません");
  }
  const supabase = getSupabase();
  const redirect =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: redirect ? { emailRedirectTo: redirect } : undefined,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function subscribeToAuth(
  callback: (session: Session | null) => void,
): () => void {
  if (!isSupabaseConfigured()) return () => undefined;
  const supabase = getSupabase();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
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
  const supabase = getSupabase();
  const row = {
    id: params.userId,
    tenant_id: params.tenantId,
    role: "student" as const,
    display_name: params.displayName,
    email: params.email ?? null,
    initials: params.initials ?? params.displayName.slice(0, 2).toUpperCase(),
  };
  // 並列タブ等で重複作成された場合の TOCTOU を避けるため upsert する。
  // RLS の profiles_update_self は role/tenant_id 変更を禁止するため、 既存行があれば
  // role/tenant_id は据え置かれ display_name 等のみが更新される。
  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Profile;
}
