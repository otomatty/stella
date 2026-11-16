import { useCallback, useEffect, useRef, useState } from "react";
import type { GuidedStagesResponse } from "@stella/shared/stage-grants/types";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { guidedStagesLoadResult } from "@/lib/guided-stages";
import { isBackendConfigured } from "@/lib/backend";

/** 失敗と0件を区別し、利用者が変わったときに前の人の案内・失敗を出さない。 */
export function useGuidedStages(userId: string | null) {
  const [loaded, setLoaded] = useState<{
    userId: string | null;
    result: ReturnType<typeof guidedStagesLoadResult>;
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
      if (!controller.signal.aborted) setLoaded({ userId, result: guidedStagesLoadResult(data) });
    } catch (error) {
      if (!controller.signal.aborted)
        setLoaded({
          userId,
          result: guidedStagesLoadResult(
            null,
            error instanceof ApiClientError ? error.status : undefined,
          ),
        });
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
  const result = loaded && loaded.userId === userId ? loaded.result : { stages: [], error: null };
  return { ...result, refetch };
}
