import type {
  ManualCompletionItem,
  ManualCompletionView,
  ManualRevokeResult,
} from "@stella/shared/tasks/manual-completion";

export type CompletionTask = ManualCompletionView["units"][number]["tasks"][number];
export type CompletionMode = "complete" | "revoke";
export type CompletionTarget = { taskId: string; problemId?: string };
export const targetKey = (target: CompletionTarget) =>
  JSON.stringify([target.taskId, target.problemId ?? null]);

export function eligibleTargets(
  tasks: readonly CompletionTask[],
  mode: CompletionMode,
): CompletionTarget[] {
  return tasks.flatMap((task) => {
    const problems = task.problems.filter((p) =>
      mode === "complete" ? p.status !== "passed" : p.source === "manual",
    );
    if (task.problems.length && problems.length)
      return problems.map((p) => ({ taskId: task.id, problemId: p.id }));
    const allowed =
      mode === "complete"
        ? task.problems.length === 0 &&
          !task.reviewSource &&
          !["passed", "ai-passed"].includes(task.status)
        : task.reviewSource === "manual" || task.obsoleteManualProblems > 0;
    return allowed ? [{ taskId: task.id }] : [];
  });
}
/** 課題・単元の「全部を選ぶ」には課題単位の印も付け、一部の問題の選択と区別する。 */
export function taskSelectionTargets(
  tasks: readonly CompletionTask[],
  mode: CompletionMode,
): CompletionTarget[] {
  return tasks.flatMap((task) => {
    const targets = eligibleTargets([task], mode);
    return mode === "revoke" &&
      targets.length > 0 &&
      targets.every((target) => target.problemId !== undefined)
      ? [...targets, { taskId: task.id }]
      : targets;
  });
}

export function selectionState(targets: CompletionTarget[], selected: ReadonlySet<string>) {
  const count = targets.filter((t) => selected.has(targetKey(t))).length;
  return {
    checked: targets.length > 0 && count === targets.length,
    mixed: count > 0 && count < targets.length,
    disabled: targets.length === 0,
  };
}
export function toggleTargets(
  targets: CompletionTarget[],
  selected: ReadonlySet<string>,
): Set<string> {
  const next = new Set(selected);
  const remove = selectionState(targets, selected).checked;
  for (const t of targets) {
    if (remove) {
      next.delete(targetKey(t));
      if (t.problemId) next.delete(targetKey({ taskId: t.taskId }));
    } else next.add(targetKey(t));
  }
  return next;
}
export function selectedItems(
  tasks: CompletionTask[],
  mode: CompletionMode,
  selected: ReadonlySet<string>,
): ManualCompletionItem[] {
  const grouped = new Map<string, ManualCompletionItem>();
  for (const target of eligibleTargets(tasks, mode)) {
    if (!selected.has(targetKey(target))) continue;
    const item = grouped.get(target.taskId) ?? {
      taskId: target.taskId,
      ...(target.problemId ? { problemIds: [] } : {}),
    };
    if (target.problemId) item.problemIds?.push(target.problemId);
    grouped.set(target.taskId, item);
  }
  for (const task of tasks) {
    const item = grouped.get(task.id);
    if (mode !== "revoke" || !item?.problemIds) continue;
    const targets = eligibleTargets([task], mode);
    const all = targets.every((target) => selected.has(targetKey(target)));
    if (all && selected.has(targetKey({ taskId: task.id }))) {
      grouped.set(task.id, { taskId: task.id });
    }
  }
  return [...grouped.values()];
}
export function completionBatches(items: ManualCompletionItem[]): ManualCompletionItem[][] {
  const batches: ManualCompletionItem[][] = [];
  for (let i = 0; i < items.length; i += 3) batches.push(items.slice(i, i + 3));
  return batches;
}
export function validCompletionReason(reason: string) {
  return reason.trim().length > 0 && reason.trim().length <= 1000;
}

/** 409 は部分成功。blocked があれば後続を送らず、今回の deleted も結果に含める。 */
export async function sendCompletionBatches(
  items: ManualCompletionItem[],
  send: (
    batch: ManualCompletionItem[],
  ) => Promise<{ changed: number; skipped?: number; blocked?: ManualRevokeResult["blocked"] }>,
  progress: (completed: number, total: number) => void,
) {
  const batches = completionBatches(items);
  let completed = 0;
  let changed = 0;
  let skipped = 0;
  for (const batch of batches) {
    try {
      const result = await send(batch);
      changed += result.changed;
      skipped += result.skipped ?? 0;
      if (result.blocked?.length)
        return {
          completed,
          total: batches.length,
          changed,
          skipped,
          blocked: result.blocked,
          error: "取り消せない項目があります。この回で取り消せた分は反映済みです。",
        };
      completed++;
      progress(completed, batches.length);
    } catch (error) {
      return {
        completed,
        total: batches.length,
        changed,
        skipped,
        blocked: [],
        error: error instanceof Error ? error.message : "送信に失敗しました",
      };
    }
  }
  return { completed, total: batches.length, changed, skipped, blocked: [], error: null };
}
export function completionSourceLabel(source: CompletionTask["reviewSource"]) {
  return source
    ? { tests: "テスト", ai: "AI", human: "人のレビュー", manual: "手で済み" }[source]
    : null;
}
export function manualCompletionUrl(stageId: string, userId: string) {
  return `/task-manual-completion?${new URLSearchParams({ stageId, userId })}`;
}

/** 問題のない課題は1件として、閉じた単元・課題にも同じ基準で済みを出す。 */
export function completionCounts(tasks: readonly CompletionTask[]) {
  let total = 0;
  let passed = 0;
  let manual = 0;
  for (const task of tasks) {
    if (task.problems.length) {
      total += task.problems.length;
      for (const problem of task.problems) {
        if (problem.status !== "passed") continue;
        passed++;
        if (problem.source === "manual") manual++;
      }
    } else {
      total++;
      if (task.reviewSource || ["passed", "ai-passed"].includes(task.status)) {
        passed++;
        if (task.reviewSource === "manual") manual++;
      }
    }
  }
  return { total, passed, manual, complete: total > 0 && passed === total };
}

/** 問題ごとの理由が同じなら課題にまとめる。提出全体の理由より問題の記録を優先する。 */
export function manualReasonSummary(task: CompletionTask) {
  const reasons = new Set(
    task.problems
      .filter((problem) => problem.source === "manual")
      .map((problem) => problem.manualReason),
  );
  const mixed = reasons.size > 1;
  const reason =
    reasons.size === 1
      ? [...reasons][0]
      : task.reviewSource === "manual"
        ? task.manualReason
        : null;
  return { mixed, reason: mixed ? null : reason };
}
