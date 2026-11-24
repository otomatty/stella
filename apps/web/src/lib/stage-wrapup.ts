/**
 * レッスンを終えた星の「仕上げ」に、まだ合格していない課題を名指しする (純関数)。
 *
 * 新形式の星は、レッスンをすべて終えても課題のレビューに合格するまでクリアにならない
 * (修了条件 = 全レッスン + 確認クイズ + 課題の合格。`stage-auto-complete.ts`)。
 * ホームの進捗バーはレッスンの完了で数えるので 100% になり、受講者からは「終えたのに
 * 次の星が開かない」に見える。何が残っているか (どの課題が、どの状態で) を札とガイドに出す。
 */

import type { TaskStatus, TaskSummary } from "@stella/shared/tasks/catalog";

import { firstOpenProblem, problemLockReason } from "./problem-lesson";
import { isProblemTask } from "./task-row";

/** クリアに数える状態 (`task-completion.ts` と同じ)。 */
const PASSED: ReadonlySet<TaskStatus> = new Set<TaskStatus>(["passed", "ai-passed"]);

/** 受講者が手を動かす番の状態。レビュー待ちより先に案内する。 */
const LEARNER_TURN: ReadonlySet<TaskStatus> = new Set<TaskStatus>([
  "not-started",
  "local-passed",
  "resubmit",
]);

export interface StageWrapup {
  /** 次に見る課題 (受講者の番の課題を先に、無ければレビュー待ちの課題)。 */
  task: Pick<TaskSummary, "id" | "title" | "status" | "lessonId">;
  /** 動画と提出で順に進む課題で案内するレッスン。 */
  nextLesson?: { id: string; action: "問題を開く" | "動画を見る" };
  /** 合格していない課題の数 (1 以上)。 */
  remaining: number;
  /** 問題・動画・課題に進む案内を出せるか。 */
  learnerTurn: boolean;
  /** 札とガイドに出す 1〜2 文。 */
  detail: string;
}

function remainingProblems(task: TaskSummary): string {
  const remaining = Math.max(0, (task.problems_total ?? 0) - (task.problems_passed ?? 0));
  return remaining > 0 ? `残り ${remaining} 問です。` : "";
}

function statusSentence(task: TaskSummary): string {
  const title = task.title;
  if (isProblemTask(task)) {
    const rest = remainingProblems(task);
    // 全問そろうまで課題は合格にならない。AI の確認待ちは案内しない。
    if (
      task.status === "local-passed" ||
      task.status === "submitted" ||
      task.status === "instructor-pending" ||
      (task.status === "not-started" && (task.problems_passed ?? 0) > 0)
    ) {
      return `課題「${title}」は取り組み中です。${rest}`;
    }
    if (task.status === "resubmit") {
      return `課題「${title}」は再提出になっています。レビューの返信を読んで直し、もう一度提出しましょう。${rest}`;
    }
    return `課題「${title}」がまだ提出されていません。VS Code で取り組んで提出しましょう。${rest}`;
  }
  switch (task.status) {
    case "local-passed":
      return `課題「${title}」はまだ提出されていません。VS Code で確認して提出しましょう。`;
    case "resubmit":
      return `課題「${title}」は再提出になっています。レビューの返信を読んで直し、もう一度提出しましょう。`;
    case "submitted":
      return `課題「${title}」は AI が確認中です。`;
    case "instructor-pending":
      return `課題「${title}」は管理者の確認待ちです。`;
    default:
      return `課題「${title}」がまだ提出されていません。VS Code で取り組んで提出しましょう。`;
  }
}

/**
 * まだ合格していない課題から、仕上げの案内を作る。
 *
 * すべて合格済み (または課題の無い星) なら null — 残りは修了の判定待ちなので、
 * 呼び出し側は従来の文面に倒す。
 */
export function stageWrapupOf(tasks: readonly TaskSummary[]): StageWrapup | null {
  const pending = tasks.filter((task) => !PASSED.has(task.status));
  const task = pending.find((t) => LEARNER_TURN.has(t.status)) ?? pending[0];
  if (!task) return null;
  const open = firstOpenProblem(task.problems);
  const locked = task.problems?.find((problem) => problem.state === "locked-video");
  const nextLesson: StageWrapup["nextLesson"] = open
    ? { id: open.stepLessonId, action: "問題を開く" }
    : locked
      ? { id: locked.afterLessonId, action: "動画を見る" }
      : undefined;
  const allProblemsSubmitted =
    task.problems?.length && task.problems.every((problem) => problem.state === "submitted");
  const nextDetail = open
    ? `次は「${open.label} ${open.title}」に取り組みましょう。`
    : locked
      ? `${problemLockReason(locked)}。`
      : allProblemsSubmitted
        ? `課題「${task.title}」の問題はすべて提出済みです。`
        : statusSentence(task);
  const remaining = pending.length;
  const tail =
    remaining === 1 && allProblemsSubmitted
      ? ""
      : remaining === 1
        ? isProblemTask(task)
          ? "全部の問題を提出すると、このステージが完了します。"
          : "レビューで合格すると、このステージが完了します。"
        : `合格していない課題があと ${remaining} 件あります。すべて合格すると、このステージが完了します。`;
  return {
    task: { id: task.id, title: task.title, status: task.status, lessonId: task.lessonId },
    remaining,
    learnerTurn: task.problems?.length ? Boolean(nextLesson) : LEARNER_TURN.has(task.status),
    ...(nextLesson ? { nextLesson } : {}),
    detail: `${nextDetail}${tail}`,
  };
}
