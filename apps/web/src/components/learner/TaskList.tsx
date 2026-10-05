import { useCallback, useEffect, useState } from "react";
import { TASK_STATUS_LABELS, type TaskSummary } from "@stella/shared/tasks/catalog";
import { TASK_KIND_LABELS } from "@stella/shared/tasks/manifest";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { OpenInVscodeButton } from "./OpenInVscodeButton";

export function TaskList({ stageId }: { stageId: string }) {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await apiFetch<{ tasks: TaskSummary[] }>(
          `/api/tasks/for-stage/${encodeURIComponent(stageId)}`,
          { signal },
        );
        if (!signal?.aborted) {
          setTasks(data.tasks);
          setError(null);
          setLoaded(true);
        }
      } catch (err) {
        if (!signal?.aborted) {
          setError(err instanceof Error ? err.message : "課題を取得できませんでした");
          setLoaded(true);
        }
      }
    },
    [stageId],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoaded(false);
    const refresh = () => {
      void load(controller.signal);
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [load]);
  return (
    <section className="border border-border rounded-lg mb-6" aria-label="単元の課題">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">単元の課題</h2>
        <Button onClick={() => void load()}>状態を更新</Button>
      </div>
      {error ? (
        <p role="alert" className="p-4 text-sm text-danger">
          {error}
        </p>
      ) : !loaded ? (
        <p className="p-4 text-sm text-ink-3">課題を読み込んでいます</p>
      ) : tasks.length === 0 ? (
        <p className="p-4 text-sm text-ink-3">課題は準備中です</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className="p-4 border-b border-border last:border-0 flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-48">
              <h3 className="text-sm font-medium">{task.title}</h3>
              <p className="text-xs text-ink-3 mt-1">
                {TASK_KIND_LABELS[task.kind]} · 約{task.estimatedMinutes}分
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-sunken">
              {TASK_STATUS_LABELS[task.status]}
            </span>
            <OpenInVscodeButton taskId={task.id} />
          </div>
        ))
      )}
    </section>
  );
}
