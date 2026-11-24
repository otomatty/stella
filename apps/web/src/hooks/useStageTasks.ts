import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskSummary } from "@stella/shared/tasks/catalog";
import { apiFetch } from "@/lib/api-client";

/** undefined は初回の取得中、null は無効または取得失敗。 */
export function useStageTasks(stageId: string, enabled: boolean): TaskSummary[] | null | undefined {
  const [result, setResult] = useState<{ stageId: string; tasks: TaskSummary[] | null } | null>(
    null,
  );
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const { tasks } = await apiFetch<{ tasks: TaskSummary[] }>(
        `/api/tasks/for-stage/${encodeURIComponent(stageId)}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setResult({ stageId, tasks });
    } catch {
      if (!controller.signal.aborted) setResult({ stageId, tasks: null });
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }, [stageId]);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => void load();
    refresh();
    // VS Code で提出した結果は、ウィンドウに戻ったときに取り直す。
    // 問題のロックは手元の進捗から求めるので、進捗の送信後や定期の取り直しはしない。
    window.addEventListener("focus", refresh);
    return () => {
      pending.current?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, load]);

  return !enabled ? null : result?.stageId === stageId ? result.tasks : undefined;
}
