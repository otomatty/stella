import { useCallback, useEffect, useRef, useState } from "react";
import type { GuidedStagesResponse } from "@stella/shared/stage-grants/types";
import { apiFetch } from "@/lib/api-client";
import { isBackendConfigured } from "@/lib/backend";

/** 失敗は枠だけを隠す。利用者が変わったときに前の人の案内を出さない。 */
export function useGuidedStages(userId?: string | null) {
  const [loaded, setLoaded] = useState<{
    userId?: string | null;
    data: GuidedStagesResponse;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const refetch = useCallback(async () => {
    if (!isBackendConfigured()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const data = await apiFetch<GuidedStagesResponse>("/api/stage-grants/mine", {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setLoaded({ userId, data });
    } catch {
      if (!controller.signal.aborted) setLoaded(null);
    }
  }, [userId]);
  useEffect(() => {
    void refetch();
    const refresh = () => {
      void refetch();
    };
    window.addEventListener("focus", refresh);
    return () => {
      request.current?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [refetch]);
  return { stages: loaded?.userId === userId ? (loaded?.data.stages ?? []) : [], refetch };
}
