/**
 * 管理 UI 向けに stages / sections / lessons をまとめて取得する Hook。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { StageRow, StageWithChildren } from "@falcon/shared/cms/types";
import { getStageWithChildren, listStages } from "@/lib/cms-api";

interface UseCmsStagesResult {
  stages: StageRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCmsStages(tenantId: string | null): UseCmsStagesResult {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!tenantId) {
      setStages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listStages(tenantId);
      if (reqId !== requestIdRef.current) return;
      setStages(rows);
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

  return { stages, loading, error, refetch };
}

interface UseCmsStageResult {
  data: StageWithChildren | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCmsStage(stageId: string | null): UseCmsStageResult {
  const [data, setData] = useState<StageWithChildren | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!stageId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getStageWithChildren(stageId);
      if (reqId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
