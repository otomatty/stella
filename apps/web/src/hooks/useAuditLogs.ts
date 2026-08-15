/**
 * 管理 UI 向けに監査ログを取得する Hook (Issue #27)。 フィルタ変更で再取得する。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { listAuditLogs, type AuditLogRow } from "@/lib/audit-logs-api";

export interface AuditFilters {
  from: string | null;
  to: string | null;
  actorId: string | null;
  action: string | null;
}

interface UseAuditLogsResult {
  logs: AuditLogRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuditLogs(tenantId: string | null, filters: AuditFilters): UseAuditLogsResult {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const { from, to, actorId, action } = filters;

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!tenantId) {
      setLogs([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listAuditLogs({ tenantId, from, to, actorId, action });
      if (reqId !== requestIdRef.current) return;
      setLogs(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [tenantId, from, to, actorId, action]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { logs, loading, error, refetch };
}
