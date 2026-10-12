/**
 * 認証セッションと profiles 行を一括で扱う React Hook。
 *
 * - 初回: `getSession()` でセッション復元 → profile を取得
 * - 変化: `subscribeToAuth` のイベントで session を更新し、 関連する profile を再取得
 *
 * Clerk (clerk) の `getSession()` は Clerk の利用者からの仮のセッションを返し、 誰なのか (アプリの
 * profiles) は `/api/me` で決まる。 ここで返す session は profile が取れてから profile の ID と
 * メールで作る (取れないうちは null = アプリを開かない)。
 *
 * バックエンド未設定時は `loading: false, session: null, profile: null` を返し、
 * 上位コンポーネントが fixtures フローへフォールバックできるようにする。
 */

import { useEffect, useState } from "react";

import { isAuthConfigured, isClerkMode } from "@/lib/auth-client";
import { AccessSessionLostError, ApiClientError } from "@/lib/api-client";
import { fetchProfile, getSession, subscribeToAuth, type Profile, type Session } from "@/lib/auth";

interface UseAuthSessionResult {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  inviteRequired: boolean;
  /** 講師・管理者が受講者用の入口から開いた (講師・管理者用の入口へ案内する)。 */
  staffHostRequired: boolean;
  /** profile を取れなかった理由 (clerk でログイン画面に出す)。 */
  error: string | null;
  /**
   * ログインしている (Clerk の) メールアドレス。招待必要画面などで、profile が無くても
   * どのアカウントでログインしているかを見せるため。
   */
  identityEmail: string | null;
  refreshProfile: () => Promise<void>;
}

function isInviteRequiredError(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 403 && err.message === "invite_required";
}

function isStaffHostRequiredError(err: unknown): boolean {
  return (
    err instanceof ApiClientError && err.status === 403 && err.message === "staff_host_required"
  );
}

/** clerk: profile から画面で使うセッションを作る (ID はアプリの profiles.id)。 */
function sessionFromProfile(profile: Profile): Session {
  return {
    accessToken: null,
    user: { id: profile.id, ...(profile.email ? { email: profile.email } : {}) },
    expiresAt: null,
  };
}

export function useAuthSession(): UseAuthSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isAuthConfigured());
  const [inviteRequired, setInviteRequired] = useState(false);
  const [staffHostRequired, setStaffHostRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identityEmail, setIdentityEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const clerk = isClerkMode();

    const load = async (next: Session | null) => {
      // dev-token はトークンの sub がそのまま profiles.id。 clerk は profile を取ってから決める。
      if (!clerk) setSession(next);
      if (!next) {
        setSession(null);
        setProfile(null);
        setInviteRequired(false);
        setStaffHostRequired(false);
        setIdentityEmail(null);
        // ログアウトしたら前のアカウントのエラーは消す (別のアカウントでログインし直せるように)。
        setError(null);
        setLoading(false);
        return;
      }
      setIdentityEmail(next.user.email ?? null);
      try {
        const p = await fetchProfile(next.user.id);
        if (!cancelled) {
          setProfile(p);
          if (clerk) setSession(p ? sessionFromProfile(p) : null);
          setInviteRequired(false);
          setStaffHostRequired(false);
          setError(p ? null : "プロフィールを取得できませんでした");
          setLoading(false);
        }
      } catch (err) {
        if (isInviteRequiredError(err) || isStaffHostRequiredError(err)) {
          if (!cancelled) {
            setProfile(null);
            setInviteRequired(isInviteRequiredError(err));
            setStaffHostRequired(isStaffHostRequiredError(err));
            setError(null);
            setLoading(false);
          }
          return;
        }
        // 講師・管理者用の入口で Access へのログインのために読み込み直している最中は、ログイン画面を出さずに待つ。
        if (err instanceof AccessSessionLostError && err.reloading) return;
        console.error("[useAuthSession] fetchProfile failed", err);
        if (!cancelled) {
          setProfile(null);
          if (clerk) setSession(null);
          setInviteRequired(false);
          setStaffHostRequired(false);
          setError(err instanceof Error ? err.message : "プロフィールを取得できませんでした");
          setLoading(false);
        }
      }
    };

    void (async () => {
      let initial: Session | null;
      try {
        initial = await getSession();
      } catch (err) {
        // Clerk を読み込めない (ネットワーク・Clerk の障害)。復元中のまま止めず、エラーを見せる。
        console.error("[useAuthSession] session restore failed", err);
        if (!cancelled) {
          setSession(null);
          setProfile(null);
          setError(
            err instanceof Error
              ? `ログインの準備ができませんでした: ${err.message}`
              : "ログインの準備ができませんでした",
          );
          setLoading(false);
        }
        return;
      }
      if (!cancelled) await load(initial);
    })();

    const unsub = subscribeToAuth((next) => {
      if (!cancelled) void load(next);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const refreshProfile = async () => {
    if (!session) return;
    try {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
      if (isClerkMode() && p) {
        // 同じ人なら同じオブジェクトのまま (session に依存する effect を走らせ直さない)。
        setSession((prev) =>
          prev?.user.id === p.id && prev.user.email === (p.email ?? undefined)
            ? prev
            : sessionFromProfile(p),
        );
      }
      setInviteRequired(false);
    } catch (err) {
      if (isInviteRequiredError(err)) {
        setProfile(null);
        setInviteRequired(true);
        return;
      }
      console.error("[useAuthSession] refreshProfile failed", err);
    }
  };

  return {
    session,
    profile,
    loading,
    inviteRequired,
    staffHostRequired,
    error,
    identityEmail,
    refreshProfile,
  };
}
