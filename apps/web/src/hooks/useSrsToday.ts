/**
 * 今日の復習キューを取得する Hook (デイリー復習 / SRS)。
 * バックエンド未設定 (デモ) / 未ログイン時は no-op で null のまま (ダミー値を出さない)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { SrsTodaySummary } from "@stella/shared/srs/types";
import { getSrsToday } from "@/lib/srs-api";
import { isBackendConfigured } from "@/lib/backend";

export interface UseSrsTodayResult {
  review: SrsTodaySummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSrsToday(userId: string | null, enabled = true): UseSrsTodayResult {
  const [review, setReview] = useState<SrsTodaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !userId || !isBackendConfigured()) {
      setReview(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getSrsToday();
      if (reqId !== requestIdRef.current) return;
      setReview(result);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { review, loading, error, refetch };
}
