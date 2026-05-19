/**
 * Assignment を id から解決する Hook。
 *
 * 解決順:
 *  1. `@falcon/shared` のバンドル済み assignments (`findAssignment`) — 同期で即返す
 *  2. ヒットしなければ Supabase の `assignments` テーブルから async 取得
 *  3. それでも見つからなければ null (UI 側で「課題が見つかりません」を表示)
 *
 * これにより、 CMS で新規作成された (= shared には存在しない) 課題も
 * `PracticeWorkspace` / `LessonPlayer` で再生できる。
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
  const synced = findAssignment(id) ?? null;
  const [assignment, setAssignment] = useState<Assignment | null>(synced);
  const [loading, setLoading] = useState(
    synced === null && isSupabaseConfigured(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 同一 id でも shared に追加された可能性があるので、 effect 起動時に再確認する。
    const fromShared = findAssignment(id) ?? null;
    if (fromShared) {
      setAssignment(fromShared);
      setLoading(false);
      setError(null);
      return;
    }
    if (!isSupabaseConfigured()) {
      setAssignment(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const row = await getAssignmentRow(id);
        if (cancelled) return;
        setAssignment(row ? mapAssignmentRowToAssignment(row) : null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "unknown");
        setAssignment(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { assignment, loading, error };
}
