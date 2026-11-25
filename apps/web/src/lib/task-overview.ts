import {
  TASK_STATUS_LABELS,
  type TaskProblemItem,
  type TaskSummary,
} from "@stella/shared/tasks/catalog";
import type { TaskRefSummary } from "@stella/shared/tasks/problem-steps";

export type ProblemTask = TaskSummary & { problem_items: TaskProblemItem[] };

export function isProblemOverview(task: TaskSummary): task is ProblemTask {
  return task.problem_items !== undefined;
}

export function isTaskPassed(task: TaskSummary): boolean {
  return task.status === "passed" || task.status === "ai-passed";
}

export function taskOverviewStatusLabel(task: ProblemTask): string {
  if (
    task.status === "not-started" &&
    task.problem_items.some((problem) => problem.state === "submitted")
  ) {
    return "取り組み中";
  }
  return TASK_STATUS_LABELS[task.status];
}

export function submittedProblemCount(problems: readonly TaskProblemItem[]): number {
  return problems.filter((problem) => problem.state === "submitted").length;
}

type TaskNextAction =
  | { kind: "problem"; problem: TaskProblemItem }
  | { kind: "video"; problem: TaskProblemItem; lessonId: string; title: string }
  | { kind: "completed"; nextLessonId: string | null }
  | { kind: "previous" }
  | { kind: "unavailable" };

export function taskNextAction(
  task: ProblemTask,
  stageTasks: readonly TaskSummary[],
): TaskNextAction {
  const problems = task.problem_items;
  const open = problems.find((problem) => problem.state === "open");
  if (open) return { kind: "problem", problem: open };

  const next = problems.find((problem) => problem.state !== "submitted");
  if (next?.state === "locked-video") {
    return next.afterLessonId && next.afterTitle
      ? { kind: "video", problem: next, lessonId: next.afterLessonId, title: next.afterTitle }
      : { kind: "unavailable" };
  }
  if (next) return { kind: "previous" };
  if (problems.length === 0) return { kind: "unavailable" };

  const index = stageTasks.findIndex((candidate) => candidate.id === task.id);
  const following = index < 0 ? [] : stageTasks.slice(index + 1);
  const nextTask = following.find((candidate) => candidate.lessonId && !isTaskPassed(candidate));
  return { kind: "completed", nextLessonId: nextTask?.lessonId ?? null };
}

export function splitProblems(problems: readonly TaskProblemItem[]) {
  return {
    drills: problems.filter((problem) => problem.label !== "応用"),
    applied: problems.filter((problem) => problem.label === "応用"),
  };
}

export function problemCellState(problem: TaskProblemItem, currentId?: string) {
  if (problem.state === "submitted") return "submitted";
  if (problem.state !== "open") return "locked";
  return problem.id === currentId ? "current" : "remaining";
}

export function taskRefText(ref: TaskRefSummary) {
  const video = ref.lessonType === "slides" || ref.lessonType === "video";
  const metadata = [video ? "動画" : "まとめ"];
  if (ref.auto) metadata.push("この問題の直前の動画");
  if (ref.stageTitle) metadata.push(ref.stageTitle);
  return {
    video,
    metadata: metadata.join(" ・ "),
    completion: ref.completed ? (video ? "視聴済み" : "読了") : undefined,
    accessNote: ref.accessible
      ? undefined
      : ref.stageTitle
        ? `「${ref.stageTitle}」を受講すると見られます`
        : "ステージを受講すると見られます",
  };
}
