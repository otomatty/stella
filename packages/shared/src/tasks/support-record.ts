/**
 * 課題ごとの支援の記録 (#38・07 §6.5・03 §7)。受講者本人と講師が同じ形で見る。
 *
 * 記録は 3 つの出どころを課題ごとに束ねる。
 * - 提出に添えた支援 (`submissions.support_log`): 受講者の申告と、拡張が `.stella/support.json` に残したもの。
 * - 提出とレビュー: 講師への相談 (相談として送った提出) と、人のレビュー (`submission_reviews`)。
 * - サーバーが記録する支援: AI チャット (`task_support_events`) と、ヒント・解答例・解説を開いた
 *   記録 (`task_help_opens`、#36。段と合格後かを持つので別の表)。固定した開始点の受け取り (#31) は
 *   提出の支援記録に写して数える。
 */

import type { TaskKind } from "./manifest.js";
import { SUPPORT_KINDS, SUPPORT_LABELS } from "./submission-support.js";

/** `task_support_events.kind` に書ける種類。ここに足せば記録・表示・水準に通る。 */
export const RECORDED_SUPPORT_KINDS = ["ai-chat", ...SUPPORT_KINDS] as const;
export type RecordedSupportKind = (typeof RECORDED_SUPPORT_KINDS)[number];

export type SupportRecordKind = RecordedSupportKind | "consult" | "human-review";

export const SUPPORT_RECORD_LABELS: Record<SupportRecordKind, string> = {
  ...SUPPORT_LABELS,
  "ai-chat": "AI チャット",
  consult: "講師への相談",
  "human-review": "人のレビュー",
};

/** 拡張が「講師に相談」で支援に足す記録の detail。相談そのものと二重に数えない。 */
export const CONSULT_SUPPORT_DETAIL = "講師への相談";

/** declared = 提出に添えた支援、submission = 相談・人のレビュー、recorded = サーバーの記録。 */
export type SupportRecordSource = "declared" | "submission" | "recorded";

export interface SupportRecordEvent {
  kind: SupportRecordKind;
  at: string;
  source: SupportRecordSource;
  detail?: string;
}

/** 03 §7 の水準。未確認は証拠が無い状態なので値を持たない (null)。 */
export type EvidenceLevel = "supported" | "independent" | "retained";

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel | "unconfirmed", string> = {
  unconfirmed: "未確認",
  supported: "支援付き",
  independent: "自力で確認",
  retained: "時間を空けて確認",
};

/** 手元の確認の要約。実行ごとの履歴・コード・メッセージは持たない。 */
export interface TaskLocalRunSummary {
  passed: number;
  failed: number;
  error: number;
  /** 最後の合格から続けて失敗した回数 (環境のエラーは数えない)。 */
  failureStreak: number;
  lastOutcome: "passed" | "failed" | "error";
  /** 最後の確認で通らなかった手順の種類 (`lint`・`test` など)。 */
  lastFailedSteps: string[];
  /** 最後の確認のテストの件数。テストのない課題では null。 */
  lastTests: { passed: number; failed: number } | null;
  lastRunAt: string;
}

export interface TaskSupportRecord {
  taskId: string;
  title: string;
  kind: TaskKind;
  stageId: string;
  stageTitle: string;
  /** 確かめるスキルを持つ課題か。持たない課題には水準を出さない。 */
  assessesSkills: boolean;
  /** 合格の証拠の水準。合格していなければ null (未確認)。 */
  level: EvidenceLevel | null;
  counts: Partial<Record<SupportRecordKind, number>>;
  /** 新しい順。多いときは新しいものから一定数だけ。 */
  events: SupportRecordEvent[];
  localRuns: TaskLocalRunSummary | null;
}
