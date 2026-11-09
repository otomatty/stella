import { useEffect, useState } from "react";
import type { TaskSummary } from "@stella/shared/tasks/catalog";
import { apiFetch } from "@/lib/api-client";

/** レッスン間で共有する課題一覧。読み込み中・失敗時は補助の表示を出さない。 */
export function useStageTasks(stageId: string, enabled: boolean): TaskSummary[] | null {
  const [result, setResult] = useState<{ stageId: string; tasks: TaskSummary[] | null } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setResult(null);
    apiFetch<{ tasks: TaskSummary[] }>(`/api/tasks/for-stage/${encodeURIComponent(stageId)}`, {
      signal: controller.signal,
    })
      .then(({ tasks }) => {
        if (!controller.signal.aborted) setResult({ stageId, tasks });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ stageId, tasks: null });
      });
    return () => controller.abort();
  }, [stageId, enabled]);

  return enabled && result?.stageId === stageId ? result.tasks : null;
}
