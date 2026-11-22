import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskSummary } from "@stella/shared/tasks/catalog";
import { apiFetch } from "@/lib/api-client";
import { subscribeProgressSynced } from "@/lib/lesson-progress";

const PROBLEM_REFRESH_MS = 15_000;

/** undefined は初回の取得中、null は無効または取得失敗。 */
export function useStageTasks(
  stageId: string,
  enabled: boolean,
  pollProblems = false,
): TaskSummary[] | null | undefined {
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
    window.addEventListener("focus", refresh);
    // 動画の完了がサーバーに届いた時点で、問題の解放状態を取り直す。
    const unsubscribe = subscribeProgressSynced(refresh);
    return () => {
      pending.current?.abort();
      window.removeEventListener("focus", refresh);
      unsubscribe();
    };
  }, [enabled, load]);

  const tasks = !enabled ? null : result?.stageId === stageId ? result.tasks : undefined;
  const shouldPoll =
    enabled && pollProblems && (tasks === null || tasks?.some((task) => task.problems?.length));
  useEffect(() => {
    if (!shouldPoll) return;
    const timer = setInterval(() => {
      if (!pending.current && document.visibilityState === "visible") void load();
    }, PROBLEM_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, shouldPoll]);

  return tasks;
}
