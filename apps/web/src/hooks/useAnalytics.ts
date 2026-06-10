/**
 * 分析ダッシュボード用 Hook (Issue #28)。
 *
 * Supabase 未設定時は集計を行わず enabled=false で空を返す (呼び出し側が
 * fixtures デモ表示にフォールバックする)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  InstructorOverview,
  TenantAnalytics,
} from "@falcon/shared/cms/types";
import {
  getInstructorOverview,
  getTenantAnalytics,
} from "@/lib/analytics-api";

interface UseTenantAnalyticsResult {
  analytics: TenantAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** 管理者ダッシュボードのテナント KPI。 tenantId を鍵にテナント切替で再取得する。 */
export function useTenantAnalytics(
  tenantId: string | null,
  enabled: boolean,
): UseTenantAnalyticsResult {
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !tenantId) {
      setAnalytics(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getTenantAnalytics();
      if (reqId !== requestIdRef.current) return;
      setAnalytics(data);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { analytics, loading, error, refetch };
}

interface UseInstructorOverviewResult {
  overview: InstructorOverview | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** 講師ダッシュボードの未返信 / 遅延 / 受講者進捗。 */
export function useInstructorOverview(
  tenantId: string | null,
  enabled: boolean,
): UseInstructorOverviewResult {
  const [overview, setOverview] = useState<InstructorOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !tenantId) {
      setOverview(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getInstructorOverview();
      if (reqId !== requestIdRef.current) return;
      setOverview(data);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { overview, loading, error, refetch };
}
