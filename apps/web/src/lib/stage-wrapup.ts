/**
 * レッスンを終えた星の「仕上げ」に、まだ合格していない課題を名指しする (純関数)。
 *
 * 新形式の星は、レッスンをすべて終えても課題のレビューに合格するまでクリアにならない
 * (修了条件 = 全レッスン + 確認クイズ + 課題の合格。`stage-auto-complete.ts`)。
 * ホームの進捗バーはレッスンの完了で数えるので 100% になり、受講者からは「終えたのに
 * 次の星が開かない」に見える。何が残っているか (どの課題が、どの状態で) を札とガイドに出す。
 */

import type { TaskStatus, TaskSummary } from "@stella/shared/tasks/catalog";

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
  /** 合格していない課題の数 (1 以上)。 */
  remaining: number;
  /** 受講者が手を動かす番か (未提出・手元で合格・再提出)。false ならレビューの結果待ち。 */
  learnerTurn: boolean;
  /** 札とガイドに出す 1〜2 文。 */
  detail: string;
}

function statusSentence(title: string, status: TaskStatus): string {
  switch (status) {
    case "local-passed":
      return `課題「${title}」は手元の確認に通っています。VS Code から提出しましょう。`;
    case "resubmit":
      return `課題「${title}」は再提出になっています。レビューの返信を読んで直し、もう一度提出しましょう。`;
    case "submitted":
      return `課題「${title}」は AI が確認中です。`;
    case "instructor-pending":
      return `課題「${title}」は講師の確認待ちです。`;
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
  const remaining = pending.length;
  const tail =
    remaining === 1
      ? "レビューで合格すると、この星がクリアになります。"
      : `合格していない課題があと ${remaining} 件あります。すべて合格すると、この星がクリアになります。`;
  return {
    task: { id: task.id, title: task.title, status: task.status, lessonId: task.lessonId },
    remaining,
    learnerTurn: LEARNER_TURN.has(task.status),
    detail: `${statusSentence(task.title, task.status)}${tail}`,
  };
}
