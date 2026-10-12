/**
 * 認証セッションと profiles 行を一括で扱う React Hook。
 *
 * - 初回: `getSession()` でセッション復元 → profile を取得
 * - 変化: `subscribeToAuth` のイベントで session を更新し、 関連する profile を再取得
 *
 * Cloudflare Access (access) では画面がトークンを持たないので、 `getSession()` は仮のセッション
 * を返し、 誰なのかは `/api/me` で決まる。 ここで返す session は profile が取れてから
 * profile の ID とメールで作る (取れないうちは null = アプリを開かない)。
 *
 * バックエンド未設定時は `loading: false, session: null, profile: null` を返し、
 * 上位コンポーネントが fixtures フローへフォールバックできるようにする。
 */

import { useEffect, useState } from "react";

import { isAccessMode, isAuthConfigured } from "@/lib/auth-client";
import { AccessSessionLostError, ApiClientError } from "@/lib/api-client";
import { fetchProfile, getSession, subscribeToAuth, type Profile, type Session } from "@/lib/auth";

interface UseAuthSessionResult {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  inviteRequired: boolean;
  /** profile を取れなかった理由 (access でログイン画面に出す)。 */
  error: string | null;
  refreshProfile: () => Promise<void>;
}

function isInviteRequiredError(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 403 && err.message === "invite_required";
}

/** access: profile から画面で使うセッションを作る (ID はアプリの profiles.id)。 */
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const access = isAccessMode();

    const load = async (next: Session | null) => {
      // dev-token はトークンの sub がそのまま profiles.id。 access は profile を取ってから決める。
      if (!access) setSession(next);
      if (!next) {
        setSession(null);
        setProfile(null);
        setInviteRequired(false);
        setLoading(false);
        return;
      }
      try {
        const p = await fetchProfile(next.user.id);
        if (!cancelled) {
          setProfile(p);
          if (access) setSession(p ? sessionFromProfile(p) : null);
          setInviteRequired(false);
          setError(p ? null : "プロフィールを取得できませんでした");
          setLoading(false);
        }
      } catch (err) {
        if (isInviteRequiredError(err)) {
          if (!cancelled) {
            setProfile(null);
            setInviteRequired(true);
            setError(null);
            setLoading(false);
          }
          return;
        }
        // Access へのログインのために読み込み直している最中は、ログイン画面を出さずに待つ。
        if (err instanceof AccessSessionLostError && err.reloading) return;
        console.error("[useAuthSession] fetchProfile failed", err);
        if (!cancelled) {
          setProfile(null);
          if (access) setSession(null);
          setInviteRequired(false);
          setError(err instanceof Error ? err.message : "プロフィールを取得できませんでした");
          setLoading(false);
        }
      }
    };

    void (async () => {
      const initial = await getSession();
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
      if (isAccessMode() && p) {
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

  return { session, profile, loading, inviteRequired, error, refreshProfile };
}
