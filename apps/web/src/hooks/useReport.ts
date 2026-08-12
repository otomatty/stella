/**
 * 管理レポートのプレビュー取得 Hook (Issue #75)。
 *
 * バックエンド未設定 / 期間が矛盾している場合は取得しない (固定のダミー行は返さない)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isInvalidPeriod,
  type ReportPeriod,
  type ReportResult,
  type ReportType,
} from "@falcon/shared/admin/reports";
import { REPORT_PREVIEW_LIMIT, fetchReport } from "@/lib/reports-api";

export interface UseReportResult {
  report: ReportResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReport(
  tenantId: string | null,
  type: ReportType,
  period: ReportPeriod,
  enabled: boolean,
): UseReportResult {
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // period はレンダーごとに新しいオブジェクトになり得るため、 値で依存させる。
  const from = period.from;
  const to = period.to;

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !tenantId || isInvalidPeriod({ from, to })) {
      setReport(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReport(type, { from, to }, REPORT_PREVIEW_LIMIT);
      if (reqId !== requestIdRef.current) return;
      setReport(result);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setReport(null);
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, from, tenantId, to, type]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { report, loading, error, refetch };
}
