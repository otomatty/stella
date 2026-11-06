/**
 * 管理 UI 向けに stages / sections / lessons をまとめて取得する Hook。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { StageRow } from "@stella/shared/cms/types";
import { listStages } from "@/lib/cms-api";

interface UseCmsStagesResult {
  stages: StageRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** `enabled` が false のあいだは取らない (ログイン前・権限の無い画面)。 */
export function useCmsStages(enabled = true): UseCmsStagesResult {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled) {
      setStages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listStages();
      if (reqId !== requestIdRef.current) return;
      setStages(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { stages, loading, error, refetch };
}
