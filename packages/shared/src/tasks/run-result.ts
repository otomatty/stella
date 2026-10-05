/**
 * 手元での実行結果。拡張が `<課題フォルダー>/.stella/last-run.json` に残し、
 * 提出のときにはファイルと一緒に送る。
 *
 * 失敗を 2 種類に分ける (docs/curriculum/04 §1・06 §7)。
 * - `failed`: 受講者のコードや配置の問題 (テストの失敗・lint の違反・ファイルが無い)。
 * - `error`:  環境や道具の問題 (Node.js が無い・npm の準備に失敗・テスト結果が読めない)。
 * 環境の問題を、受講者の力不足として扱わないための区別である。
 */

import type { RunnerId } from "./runners.js";

export type StepStatus = "passed" | "failed" | "error" | "skipped";
/** `cancelled` は受講者が途中で止めた実行。何も確かめていないので合格にしない。 */
export type RunOutcome = "passed" | "failed" | "error" | "cancelled";

export type RunStepId =
  | "deps"
  | "browsers"
  | "lint"
  | "format"
  | "test"
  | "build"
  | "e2e"
  | "static"
  | "diagnose"
  | "files";

export interface TestCaseResult {
  name: string;
  /** 課題フォルダーからの相対パス。分からなければ省略。 */
  file?: string;
  status: "passed" | "failed" | "skipped";
  message?: string;
}

export interface LintFinding {
  file: string;
  line: number;
  column: number;
  ruleId: string | null;
  message: string;
  severity: "error" | "warning";
}

export interface RunStepResult {
  id: RunStepId;
  label: string;
  status: StepStatus;
  durationMs: number;
  /** 一行の要約 (例 "8 件中 7 件が合格")。 */
  summary: string;
  tests?: TestCaseResult[];
  lint?: LintFinding[];
  /** 整形が必要なファイルや、見つからなかったファイル。 */
  files?: string[];
  /** 失敗・エラーのときの出力の末尾。 */
  logTail?: string;
}

export interface HashedFile {
  /** 課題フォルダーからの相対パス (`/` 区切り)。 */
  path: string;
  /** `normalizeForHash` を通した内容の SHA-256 (16 進)。 */
  sha256: string;
  bytes: number;
}

export interface RunResult {
  schemaVersion: 1;
  taskId: string;
  runner: RunnerId;
  outcome: RunOutcome;
  startedAt: string;
  durationMs: number;
  /** `process.platform` の値 (win32 / darwin / linux)。 */
  platform: string;
  /** 実行に使った道具の版 (コマンドの出力そのまま)。 */
  toolVersions: Partial<Record<"node" | "npm" | "git", string>>;
  steps: RunStepResult[];
  /** 提出するファイル (submit.files に当たったもの)。 */
  files: HashedFile[];
  /** 配布したテスト・設定 (protected に当たったもの)。 */
  protected: HashedFile[];
  /** 実行したときの `.stella/task.json` の SHA-256。 */
  manifestSha256: string;
}

/**
 * 手順の結果から全体の結果を決める。中断を最優先し、次にエラー、失敗の順。
 * 1 つも手順が通っていない (すべて省略) ときは合格にしない — 何も確かめていないため。
 */
export function decideOutcome(
  steps: readonly Pick<RunStepResult, "status">[],
  options: { cancelled?: boolean } = {},
): RunOutcome {
  if (options.cancelled) return "cancelled";
  if (steps.some((step) => step.status === "error")) return "error";
  if (steps.some((step) => step.status === "failed")) return "failed";
  if (!steps.some((step) => step.status === "passed")) return "error";
  return "passed";
}

/** 提出してよい結果か。全部の手順が通り、提出するファイルがあること。 */
export function canSubmit(result: Pick<RunResult, "outcome" | "files">): boolean {
  return result.outcome === "passed" && result.files.length > 0;
}

export const RUN_OUTCOME_LABELS: Readonly<Record<RunOutcome, string>> = {
  passed: "すべて通りました",
  failed: "直すところがあります",
  error: "環境の問題で確認できませんでした",
  cancelled: "確認を中断しました",
};

export const STEP_STATUS_LABELS: Readonly<Record<StepStatus, string>> = {
  passed: "通過",
  failed: "要修正",
  error: "環境の問題",
  skipped: "省略",
};
