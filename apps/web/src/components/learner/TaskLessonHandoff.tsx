import { useEffect, useState } from "react";
import type { TaskSummary } from "@stella/shared/tasks/catalog";
import { apiFetch } from "@/lib/api-client";
import { OpenInVscodeButton } from "./OpenInVscodeButton";

/**
 * format 2 の課題文レッスンから、課題を VS Code の学習フォルダーへ配る。
 * レッスンと課題の対応は seed が `tasks.lesson_id` に入れ、課題一覧 API が返す。
 * ボタンは接続コード付きの task URI を開くので、拡張が未接続でも 1 クリックで
 * 接続 → 課題の準備 → 課題文の表示まで進む。課題文でないレッスンでは何も出さない。
 */
export function TaskLessonHandoff({ stageId, lessonId }: { stageId: string; lessonId: string }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setTaskId(null);
    apiFetch<{ tasks: TaskSummary[] }>(`/api/tasks/for-stage/${encodeURIComponent(stageId)}`, {
      signal: controller.signal,
    })
      .then(({ tasks }) => {
        if (!controller.signal.aborted)
          setTaskId(tasks.find((task) => task.lessonId === lessonId)?.id ?? null);
      })
      .catch(() => {
        // 課題を引けなくても課題文は読める。ボタンを出さないだけにする。
      });
    return () => controller.abort();
  }, [stageId, lessonId]);
  if (!taskId) return null;
  return (
    <div className="mb-5 rounded-lg border border-border p-4 flex flex-wrap items-center gap-3">
      <p className="flex-1 min-w-48 text-[13px] text-ink-2">
        この課題はパソコンの VS Code
        で進めます。ボタンを押すと、学習フォルダーに課題を準備して開きます。準備先に自分のファイルがあるときは上書きしません。
      </p>
      <OpenInVscodeButton taskId={taskId} />
    </div>
  );
}
