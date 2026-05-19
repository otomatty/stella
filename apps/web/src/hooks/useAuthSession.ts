/**
 * Supabase Auth セッションと profiles 行を一括で扱う React Hook。
 *
 * - 初回: `getSession()` でセッション復元 → profile を取得
 * - 変化: `subscribeToAuth` のイベントで session を更新し、 関連する profile を再取得
 *
 * Supabase 未設定時は `loading: false, session: null, profile: null` を返し、
 * 上位コンポーネントが fixtures フローへフォールバックできるようにする。
 */

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchProfile,
  getSession,
  subscribeToAuth,
  type Profile,
} from "@/lib/auth";

interface UseAuthSessionResult {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

export function useAuthSession(): UseAuthSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async (next: Session | null) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const p = await fetchProfile(next.user.id);
        if (!cancelled) {
          setProfile(p);
          setLoading(false);
        }
      } catch (err) {
        console.error("[useAuthSession] fetchProfile failed", err);
        if (!cancelled) {
          setProfile(null);
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
    const p = await fetchProfile(session.user.id);
    setProfile(p);
  };

  return { session, profile, loading, refreshProfile };
}
