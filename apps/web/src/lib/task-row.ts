import { TASK_STATUS_LABELS, type TaskSummary } from "@stella/shared/tasks/catalog";

/** 問題つきの課題か。`problems_total` は問題のある課題だけ API が返す。 */
export function isProblemTask(task: { problems_total?: number }): boolean {
  return typeof task.problems_total === "number" && task.problems_total > 0;
}

/** 行に出す「12/20 問」。問題の無い課題は出さない。 */
export function taskProblemCountLabel(task: {
  problems_total?: number;
  problems_passed?: number;
}): string | null {
  if (!isProblemTask(task)) return null;
  return `${task.problems_passed ?? 0}/${task.problems_total} 問`;
}

/**
 * 課題の状態の文言。問題つきの課題は、全問そろうまで合格にならない。
 * `local-passed` は取り組み中。提出待ちの「AI が確認中」は出さない。
 */
export function taskStatusLabel(
  task: Pick<TaskSummary, "status" | "problems_total" | "problems_passed">,
): string {
  if (!isProblemTask(task)) return TASK_STATUS_LABELS[task.status];
  if (task.status === "passed" || task.status === "ai-passed") return "合格";
  if (task.status === "not-started") return "未着手";
  if (task.status === "resubmit") return TASK_STATUS_LABELS.resubmit;
  return "取り組み中";
}
