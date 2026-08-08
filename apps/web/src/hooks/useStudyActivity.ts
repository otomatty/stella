/**
 * 受講者本人の日別学習ログを取得する Hook (Issue #73)。
 *
 * バックエンド未設定 (デモ) / 未ログイン時は no-op。 固定のダミー値は返さず null のままにし、
 * 呼び出し側で空状態を出す (実データが無いのに学習実績があるように見せない)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { StudyActivitySummary } from "@falcon/shared/study/activity";
import { getMyStudyActivity } from "@/lib/study-activity-api";
import { isBackendConfigured } from "@/lib/backend";

export interface UseStudyActivityResult {
  activity: StudyActivitySummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStudyActivity(
  userId: string | null,
  days = 14,
  enabled = true,
): UseStudyActivityResult {
  const [activity, setActivity] = useState<StudyActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !userId || !isBackendConfigured()) {
      setActivity(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getMyStudyActivity(days);
      if (reqId !== requestIdRef.current) return;
      setActivity(result);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [days, enabled, userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { activity, loading, error, refetch };
}
