/**
 * 講師のレビュー画面 (Issue #34、docs/curriculum/07 §6.3・§6.4) の共有の定義。
 *
 * - 人に回した提出のキューを、人に回した理由で分ける (`reviewQueueGroup`)。
 * - AI が合格にした提出の事後確認 (確認済み・コメント・覆した) の語彙。
 * - しきい値の月次見直しに使う数字の形と、目立たせる境目。しきい値そのものは自動で変えない。
 *
 * web と api の両方から読むので、実行時の依存を持たない。
 */

import type { Confidence, RouteReason } from "./ai-review.js";

/**
 * 人に回した提出のキューの分け方 (07 §6.4 の 2)。並びは分類の優先順でもある。1 件は先に
 * 当たった 1 つの分類に入れる (相談と照合の食い違いが重なれば相談)。
 * 旧形式の提出 (`task_id` が無い、VS Code の旧演習の引き継ぎ) は AI を通らないので別に置く。
 */
export const REVIEW_QUEUE_GROUPS = [
  "consult",
  "mismatch",
  "ai-failed",
  "rule",
  "confidence",
  "legacy",
] as const;
export type ReviewQueueGroup = (typeof REVIEW_QUEUE_GROUPS)[number];
export const REVIEW_QUEUE_GROUP_LABELS: Record<ReviewQueueGroup, string> = {
  consult: "相談",
  mismatch: "ハッシュの不一致",
  "ai-failed": "AI の判定不能",
  rule: "規則の違反",
  confidence: "確信度",
  legacy: "旧形式の提出",
};

/** 人に回した理由ごとの分類。 */
const GROUP_OF_REASON: Record<RouteReason, Exclude<ReviewQueueGroup, "legacy">> = {
  consult: "consult",
  "machine-check": "mismatch",
  "ai-unavailable": "ai-failed",
  // 課題に必須の評価項目が無いと、AI は合否を出せない。
  "no-rubric": "ai-failed",
  "rubric-unmet": "rule",
  "task-condition": "rule",
  // 確認A・Bで使ってはいけない支援を使った (課題の決まりの違反)。
  "unallowed-support": "rule",
  "rubric-undetermined": "confidence",
  "low-confidence": "confidence",
  "misplaced-finding": "confidence",
  // 返信が解答例と重なった = AI の出力をそのまま信用できない。
  "solution-leak": "confidence",
};

/** 提出が入るキューの分類。 */
export function reviewQueueGroup(input: {
  taskId?: string | null;
  routeReasons: readonly RouteReason[];
}): ReviewQueueGroup {
  if (!input.taskId) return "legacy";
  const groups = new Set(input.routeReasons.map((r) => GROUP_OF_REASON[r]));
  // 理由が無いのに人に回っている提出 (記録の前に人に回したもの) は、AI の判定が無い側に置く。
  return (
    REVIEW_QUEUE_GROUPS.find((g) => groups.has(g as Exclude<ReviewQueueGroup, "legacy">)) ??
    "ai-failed"
  );
}

/** キューの並べ方。待ち時間 (長い順)・理由 (分類の順)・担当者 (名前順、担当なしは最後)。 */
export const REVIEW_QUEUE_SORTS = ["wait", "reason", "assignee"] as const;
export type ReviewQueueSort = (typeof REVIEW_QUEUE_SORTS)[number];
export const REVIEW_QUEUE_SORT_LABELS: Record<ReviewQueueSort, string> = {
  wait: "待ち時間",
  reason: "理由",
  assignee: "担当者",
};

export interface QueueSortable {
  submittedAt: number;
  group: ReviewQueueGroup;
  assigneeName: string | null;
}

/** キューの比較関数。同じ理由・同じ担当者の中は、待ち時間の長い順にする。 */
export function compareQueueItems(sort: ReviewQueueSort) {
  return (a: QueueSortable, b: QueueSortable): number => {
    if (sort === "reason") {
      const diff = REVIEW_QUEUE_GROUPS.indexOf(a.group) - REVIEW_QUEUE_GROUPS.indexOf(b.group);
      if (diff !== 0) return diff;
    }
    if (sort === "assignee" && a.assigneeName !== b.assigneeName) {
      if (a.assigneeName === null) return 1;
      if (b.assigneeName === null) return -1;
      return a.assigneeName.localeCompare(b.assigneeName, "ja");
    }
    return a.submittedAt - b.submittedAt;
  };
}

// ---------------------------------------------------------------
// AI が合格にした提出の事後確認 (07 §6.4 の 6)
// ---------------------------------------------------------------

/** 確認の結果。覆したあとも記録は残す。 */
export const CHECK_RESULTS = ["confirmed", "commented", "overturned"] as const;
export type CheckResult = (typeof CHECK_RESULTS)[number];
export const CHECK_RESULT_LABELS: Record<CheckResult, string> = {
  confirmed: "確認済み",
  commented: "コメント",
  overturned: "覆した",
};

/** 人ができる 3 つの操作。 */
export const CHECK_ACTIONS = ["confirm", "comment", "overturn"] as const;
export type CheckAction = (typeof CHECK_ACTIONS)[number];
export const CHECK_RESULT_OF_ACTION: Record<CheckAction, CheckResult> = {
  confirm: "confirmed",
  comment: "commented",
  overturn: "overturned",
};

/** コメント・覆す理由の長さの上限 (総評と同じ桁)。 */
export const MAX_CHECK_COMMENT = 4000;

/** 確認の記録 1 件 (staff に返す)。 */
export interface SubmissionCheckRecord {
  id: string;
  result: CheckResult;
  comment: string;
  reviewerId: string | null;
  reviewerName: string | null;
  createdAt: string;
}

/** 受講者に返す、講師が判定を変えずに足したコメント。 */
export interface StaffComment {
  comment: string;
  createdAt: string;
}

/** 事後確認の一覧の状態の絞り込み。 */
export const AI_PASSED_STATES = ["unchecked", "checked", "all"] as const;
export type AiPassedState = (typeof AI_PASSED_STATES)[number];
export const AI_PASSED_STATE_LABELS: Record<AiPassedState, string> = {
  unchecked: "未確認",
  checked: "確認済み",
  all: "すべて",
};

/** AI が合格にした提出の一覧の 1 行。 */
export interface AiPassedRow {
  submissionId: string;
  studentId: string | null;
  studentName: string;
  stageId: string;
  stageTitle: string;
  taskId: string;
  taskTitle: string;
  taskKind: string | null;
  confidence: Confidence | null;
  /** AI の合格を当てた日時。 */
  aiPassedAt: string | null;
  submittedAt: string;
  /** 今の判定。覆したあとは resubmit。 */
  verdict: "pass" | "resubmit" | "fail" | null;
  checkCount: number;
  lastCheck: { result: CheckResult; reviewerName: string | null; createdAt: string } | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

/**
 * 一覧の既定の並び。確信度が「中」を先に、その中は AI が合格にした日時の新しい順 (07 §6.4 の 6)。
 * サーバーの SQL と同じ並びを画面でも使う (絞り込みの切り替えで並びが揺れないように)。
 */
export function compareAiPassed(a: AiPassedRow, b: AiPassedRow): number {
  const rank = (row: AiPassedRow) => (row.confidence === "medium" ? 0 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  return (b.aiPassedAt ?? "").localeCompare(a.aiPassedAt ?? "");
}

// ---------------------------------------------------------------
// しきい値の月次見直しに使う数字 (07 §6.3)
// ---------------------------------------------------------------

/**
 * 目立たせる境目。超えた行を画面で目立たせるだけで、しきい値は自動では変えない。
 * - 練習の「中」で AI が合格にした提出のうち、人が覆した割合 > 1 割 → その講座の練習も中から人に回す
 * - 人に回した提出のうち、人がそのまま合格にした割合 > 8 割 → 条件が厳しすぎる
 * - 課題ごとの、人に回した割合 > 3 割 → AI より先に課題文とルーブリックを見直す
 */
export const REVIEW_METRIC_ALERTS = {
  practiceMediumOverturned: 0.1,
  escalatedPassedAsIs: 0.8,
  taskEscalated: 0.3,
} as const;

/** 割合が境目を超えているか。分母が 0 (割合が出ない) なら超えていない。 */
export function exceedsAlert(rate: number | null, limit: number): boolean {
  return rate !== null && rate > limit;
}

export function ratio(hit: number, total: number): number | null {
  return total === 0 ? null : hit / total;
}

/** 講座ごとの、練習の「中」で AI が合格にした提出と人の確認。 */
export interface PracticeMediumMetric {
  stageId: string;
  stageTitle: string;
  aiPassed: number;
  /** 人が確認した (確認済み・コメント・覆したのどれか) 件数。割合の分母。 */
  checked: number;
  overturned: number;
  /** 覆した / 人が確認した。確認していない提出は覆したかが分からないので分母に入れない。 */
  rate: number | null;
  exceeds: boolean;
}

/** 種別 (または人に回した理由) ごとの、人に回した提出の人の判定。 */
export interface EscalatedMetric {
  key: string;
  label: string;
  decided: number;
  passedAsIs: number;
  rate: number | null;
  exceeds: boolean;
}

/** 課題ごとの、人に回した割合。 */
export interface TaskEscalationMetric {
  taskId: string;
  taskTitle: string;
  stageTitle: string;
  /** AI が判定した提出 (AI で確定 + 人に回した)。 */
  reviewed: number;
  escalated: number;
  rate: number | null;
  exceeds: boolean;
}

export interface ReviewMetrics {
  days: number;
  since: string;
  practiceMedium: PracticeMediumMetric[];
  escalatedByKind: EscalatedMetric[];
  escalatedByReason: EscalatedMetric[];
  taskEscalation: TaskEscalationMetric[];
}

// ---------------------------------------------------------------
// コメント集 (07 §6.4 の 4)
// ---------------------------------------------------------------

export const MAX_TEMPLATE_VIOLATION = 200;
export const MAX_TEMPLATE_BODY = 4000;

export interface ReviewCommentTemplate {
  id: string;
  /** null = テナントの全講座。 */
  stageId: string | null;
  /** null = 講座の全パターン。 */
  pattern: string | null;
  ruleId: string | null;
  violation: string;
  body: string;
  createdByName: string | null;
  updatedAt: string;
}

/** 提出の課題に当てはまる定型コメントか (講座とパターンが合うか、指定が無いか)。 */
export function templateApplies(
  template: Pick<ReviewCommentTemplate, "stageId" | "pattern">,
  task: { stageId: string | null; pattern: string | null },
): boolean {
  if (template.stageId !== null && template.stageId !== task.stageId) return false;
  return template.pattern === null || template.pattern === task.pattern;
}

// ---------------------------------------------------------------
// 同じ課題の提出を並べて見る (07 §6.4 の 5)
// ---------------------------------------------------------------

export interface TaskBoardSubmission {
  submissionId: string;
  studentId: string | null;
  studentName: string;
  attempt: number;
  submittedAt: string;
  verdict: "pass" | "resubmit" | "fail" | null;
  reviewSource: "ai" | "human" | null;
  aiReviewStatus: string | null;
  confidence: Confidence | null;
  routeReasons: RouteReason[];
  /** ルーブリックの項目 ID → AI の結果。 */
  rubric: Record<string, "met" | "unmet" | "undetermined">;
  findingCount: number;
}

export interface TaskBoardItem {
  id: string;
  criterion: string;
  required: boolean;
  met: number;
  unmet: number;
  undetermined: number;
}

export interface TaskBoard {
  task: {
    id: string;
    title: string;
    kind: string;
    pattern: string;
    stageId: string;
    stageTitle: string;
  };
  /** 受講者ごとの最新の提出。 */
  submissions: TaskBoardSubmission[];
  /** ルーブリックの項目ごとの集計。「満たさない」が多い項目が共通のつまずき。 */
  items: TaskBoardItem[];
}
