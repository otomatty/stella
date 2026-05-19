/**
 * Assignment を id から解決する Hook。
 *
 * 解決順 (Supabase が設定されている場合):
 *  1. 初期表示用に `@falcon/shared` のバンドル版を fast-path として返す (あれば)
 *  2. その後 async で Supabase の `assignments` を問い合わせ、 ヒットしたら上書き
 *     — CMS で編集 / 新規作成されたバージョンを優先する (#10 — Codex P2)
 *  3. DB に無ければ shared の値を保持。 shared にも無ければ null
 *
 * Supabase 未設定時は 1 だけで完了 (従来通り fixtures 動作)。
 */

import { useEffect, useState } from "react";
import type { Assignment } from "@falcon/shared/types";
import { findAssignment } from "@falcon/shared/assignments";
import { mapAssignmentRowToAssignment } from "@falcon/shared/cms/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAssignmentRow } from "@/lib/cms-api";

interface Result {
  assignment: Assignment | null;
  loading: boolean;
  error: string | null;
}

export function useResolvedAssignment(id: string): Result {
  const supabaseEnabled = isSupabaseConfigured();
  const sharedFallback = findAssignment(id) ?? null;

  const [assignment, setAssignment] = useState<Assignment | null>(sharedFallback);
  // shared にも DB にも無い可能性があるので、 supabase が有効で shared に無い時のみ「読込中」を出す。
  const [loading, setLoading] = useState(supabaseEnabled && !sharedFallback);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fallback = findAssignment(id) ?? null;
    if (!supabaseEnabled) {
      setAssignment(fallback);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    // shared にあれば fast-path で表示しつつ DB も問い合わせて差分があれば反映 (SWR 風)。
    // shared に無い場合のみスピナー表示。
    if (!fallback) setLoading(true);
    (async () => {
      try {
        const row = await getAssignmentRow(id);
        if (cancelled) return;
        if (row) {
          // DB の最新版を優先 (CMS 編集を反映)。
          setAssignment(mapAssignmentRowToAssignment(row));
        } else {
          // DB に無ければ shared を採用 (RLS で隠れた可能性 / seed 未実行)。
          setAssignment(fallback);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "unknown");
        // DB エラー時は shared にフォールバックして UI を壊さない。
        setAssignment(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabaseEnabled]);

  return { assignment, loading, error };
}
