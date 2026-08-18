/**
 * 割当プリセット一覧の取得 Hook。
 *
 * 件数はテナントあたり数十を想定しているので、 一覧をまるごと持って画面側で絞り込む
 * (受講登録画面のプリセットタブと適用ダイアログが同じデータを見る)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { EnrollmentPresetWithItems } from "@falcon/shared/enrollment/preset";
import { listEnrollmentPresets } from "@/lib/enrollment-presets-api";

interface UseEnrollmentPresetsResult {
  presets: EnrollmentPresetWithItems[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEnrollmentPresets(tenantId: string | null): UseEnrollmentPresetsResult {
  const [presets, setPresets] = useState<EnrollmentPresetWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!tenantId) {
      setPresets([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listEnrollmentPresets();
      if (reqId !== requestIdRef.current) return;
      setPresets(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { presets, loading, error, refetch };
}
