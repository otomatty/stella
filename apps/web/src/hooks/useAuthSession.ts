/**
 * 認証セッションと profiles 行を一括で扱う React Hook。
 *
 * - 初回・変化とも: `subscribeToAuth` の通知で session を受け取り、 profile を取得
 *   (初回は `getSession()` がサーバーからセッションを読み、 購読者へ通知する)
 *
 * バックエンド未設定時は `loading: false, session: null, profile: null` を返し、
 * 上位コンポーネントが fixtures フローへフォールバックできるようにする。
 */

import { useEffect, useState } from "react";

import { isAuthConfigured } from "@/lib/auth-client";
import { ApiClientError } from "@/lib/api-client";
import { fetchProfile, getSession, subscribeToAuth, type Profile, type Session } from "@/lib/auth";

interface UseAuthSessionResult {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  inviteRequired: boolean;
  refreshProfile: () => Promise<void>;
}

function isInviteRequiredError(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 403 && err.message === "invite_required";
}

export function useAuthSession(): UseAuthSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isAuthConfigured());
  const [inviteRequired, setInviteRequired] = useState(false);

  useEffect(() => {
    if (!isAuthConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async (next: Session | null) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setInviteRequired(false);
        setLoading(false);
        return;
      }
      try {
        const p = await fetchProfile(next.user.id);
        if (!cancelled) {
          setProfile(p);
          setInviteRequired(false);
          setLoading(false);
        }
      } catch (err) {
        if (isInviteRequiredError(err)) {
          if (!cancelled) {
            setProfile(null);
            setInviteRequired(true);
            setLoading(false);
          }
          return;
        }
        console.error("[useAuthSession] fetchProfile failed", err);
        if (!cancelled) {
          setProfile(null);
          setInviteRequired(false);
          setLoading(false);
        }
      }
    };

    // getSession tells every subscriber (this one included), so the first load and later
    // changes (another tab, sign-out) go through one path and /api/me is read once.
    const unsub = subscribeToAuth((next) => {
      if (!cancelled) void load(next);
    });
    void getSession();

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

  return { session, profile, loading, inviteRequired, refreshProfile };
}
