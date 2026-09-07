/**
 * レッスン配布資料の一覧を取得する Hook (Issue #72)。
 *
 * バックエンド未設定時や fixtures レッスン (非 uuid) では no-op (空配列) で、
 * モックには依存しない。 連続フェッチの取り違えは requestId で防ぐ。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { LessonMaterialRow } from "@stella/shared/cms/types";
import { listLessonMaterials } from "@/lib/cms-api";
import { isBackendConfigured } from "@/lib/backend";

export interface UseLessonMaterialsResult {
  materials: LessonMaterialRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLessonMaterials(
  lessonId: string | null,
  enabled = true,
): UseLessonMaterialsResult {
  const [materials, setMaterials] = useState<LessonMaterialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const active = enabled && Boolean(lessonId);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!active || !lessonId || !isBackendConfigured()) {
      setMaterials([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listLessonMaterials(lessonId);
      if (reqId !== requestIdRef.current) return;
      setMaterials(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [active, lessonId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { materials, loading, error, refetch };
}
