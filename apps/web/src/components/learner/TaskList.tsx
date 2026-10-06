import { useCallback, useEffect, useRef, useState } from "react";
import { TASK_STATUS_LABELS, type TaskSummary } from "@stella/shared/tasks/catalog";
import { TASK_KIND_LABELS } from "@stella/shared/tasks/manifest";
import type { TaskSupportRecord } from "@stella/shared/tasks/support-record";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { OpenInVscodeButton } from "./OpenInVscodeButton";
import { TaskSupportSummary } from "./TaskSupportSummary";

export function TaskList({
  stageId,
  onAskAi,
}: {
  stageId: string;
  /** 課題の文脈で AI チャットを開く。相談は支援の記録に残る (#38)。 */
  onAskAi?: (task: { id: string; title: string }) => void;
}) {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [support, setSupport] = useState<Map<string, TaskSupportRecord>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const { signal } = controller;
    setLoaded(false);
    setTasks([]);
    setError(null);
    // 支援の記録は補助の表示。取れなくても課題の一覧は出す。
    void apiFetch<{ tasks: TaskSupportRecord[] }>(
      `/api/task-support?stageId=${encodeURIComponent(stageId)}`,
      { signal },
    )
      .then((data) => {
        if (!signal.aborted) setSupport(new Map(data.tasks.map((r) => [r.taskId, r])));
      })
      .catch(() => {
        if (!signal.aborted) setSupport(new Map());
      });
    try {
      const data = await apiFetch<{ tasks: TaskSummary[] }>(
        `/api/tasks/for-stage/${encodeURIComponent(stageId)}`,
        { signal },
      );
      if (!signal.aborted) {
        setTasks(data.tasks);
        setError(null);
        setLoaded(true);
      }
    } catch (err) {
      if (!signal.aborted) {
        setError(err instanceof Error ? err.message : "課題を取得できませんでした");
        setLoaded(true);
      }
    }
  }, [stageId]);
  useEffect(() => {
    const refresh = () => {
      void load();
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      pending.current?.abort();
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
        tasks.map((task) => {
          const record = support.get(task.id);
          return (
            <div key={task.id} className="p-4 border-b border-border last:border-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-48">
                  <h3 className="text-sm font-medium">{task.title}</h3>
                  <p className="text-xs text-ink-3 mt-1">
                    {TASK_KIND_LABELS[task.kind]} · 約{task.estimatedMinutes}分
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-sunken">
                  {TASK_STATUS_LABELS[task.status]}
                </span>
                {onAskAi ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAskAi({ id: task.id, title: task.title })}
                  >
                    AI に相談
                  </Button>
                ) : null}
                <OpenInVscodeButton taskId={task.id} />
              </div>
              {record ? <TaskSupportSummary record={record} /> : null}
            </div>
          );
        })
      )}
    </section>
  );
}
