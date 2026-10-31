/**
 * レッスンを終えた星の、まだ合格していない課題 (ホームの「仕上げ」の案内)。
 *
 * `stageId` が null のあいだ (レッスンが残っている・新形式でない・デモ) は取りに行かない。
 * 提出は VS Code から行うので、ウィンドウへ戻ってきたら取り直す (提出後の「AI が確認中」や
 * レビューの結果をホームに反映する)。取れなかったときは null — 呼び出し側は従来の文面に倒す。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { TaskSummary } from "@stella/shared/tasks/catalog";
import { apiFetch } from "@/lib/api-client";
import { type StageWrapup, stageWrapupOf } from "@/lib/stage-wrapup";

export function useStageWrapup(stageId: string | null): StageWrapup | null {
  const [wrapup, setWrapup] = useState<{ stageId: string; value: StageWrapup | null } | null>(null);
  const pending = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    pending.current?.abort();
    if (!stageId) return;
    const controller = new AbortController();
    pending.current = controller;
    try {
      const data = await apiFetch<{ tasks: TaskSummary[] }>(
        `/api/tasks/for-stage/${encodeURIComponent(stageId)}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setWrapup({ stageId, value: stageWrapupOf(data.tasks) });
    } catch {
      // 補助の表示なので、取れなければ従来の文面のまま (前に読んだ値も出さない)。
      if (!controller.signal.aborted) setWrapup({ stageId, value: null });
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

  // 別の星の結果を出さない (星を切り替えた直後、取り直すまでのあいだ)。
  return stageId && wrapup?.stageId === stageId ? wrapup.value : null;
}
