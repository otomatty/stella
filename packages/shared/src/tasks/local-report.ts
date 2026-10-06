/**
 * 手元の確認の結果のうち、拡張が LMS に送る要約 (#38・07 §6.5)。
 *
 * 送るのは、課題 ID・配布した版の内容ハッシュ・全体の結果・通らなかった手順の種類・
 * テストの件数だけ。コード・ファイル名・ファイルの内容ハッシュ・テスト名・メッセージ・
 * ログ・道具の版・OS は送らない。時刻はサーバーが付ける。
 * つまずきの検知 (同じ課題で失敗が続く) に要るのは回数と時刻で、中身は要らないため。
 */

import type { RunOutcome, RunResult, RunStepId } from "./run-result.js";

/** 送ってよい手順の種類。runner の固定の手順と同じ語彙で、自由な文字列は受け取らない。 */
export const LOCAL_REPORT_STEP_IDS = [
  "deps",
  "browsers",
  "lint",
  "format",
  "test",
  "build",
  "e2e",
  "static",
  "diagnose",
  "files",
] as const satisfies readonly RunStepId[];

/** 中断した実行は何も確かめていないので送らない。 */
export type LocalReportOutcome = Exclude<RunOutcome, "cancelled">;

export interface LocalRunReport {
  taskId: string;
  contentHash: string;
  outcome: LocalReportOutcome;
  /** 失敗・エラーになった手順の種類。 */
  failedSteps: RunStepId[];
  /** テストの件数。テストを持たない runner では null。 */
  tests: { passed: number; failed: number } | null;
}

const MAX_TEST_COUNT = 100_000;

/** 実行結果から送る要約を作る。中断した実行は null。 */
export function toLocalRunReport(
  result: Pick<RunResult, "outcome" | "steps">,
  receipt: { taskId: string; contentHash: string },
): LocalRunReport | null {
  if (result.outcome === "cancelled") return null;
  const failedSteps = [
    ...new Set(
      result.steps
        .filter((s) => s.status === "failed" || s.status === "error")
        .map((s) => s.id)
        .filter((id) => (LOCAL_REPORT_STEP_IDS as readonly string[]).includes(id)),
    ),
  ];
  const cases = result.steps.flatMap((s) => s.tests ?? []);
  return {
    taskId: receipt.taskId,
    contentHash: receipt.contentHash,
    outcome: result.outcome,
    failedSteps,
    tests: cases.length
      ? {
          passed: cases.filter((t) => t.status === "passed").length,
          failed: cases.filter((t) => t.status === "failed").length,
        }
      : null,
  };
}

const count = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= MAX_TEST_COUNT;

/**
 * API 側の検証。旧拡張は合格のときだけ `{ taskId, contentHash }` を送るので、
 * `outcome` が無ければ合格として扱う。知らない項目は読まずに捨てる。
 */
export function parseLocalRunReport(v: unknown): LocalRunReport {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    throw new Error("taskId and contentHash are required");
  const body = v as Record<string, unknown>;
  if (
    typeof body.taskId !== "string" ||
    typeof body.contentHash !== "string" ||
    body.taskId.length > 300 ||
    body.contentHash.length > 128
  )
    throw new Error("taskId and contentHash are required");
  const outcome = body.outcome ?? "passed";
  if (outcome !== "passed" && outcome !== "failed" && outcome !== "error")
    throw new Error("outcome が不正です");
  const failedSteps = body.failedSteps ?? [];
  if (
    !Array.isArray(failedSteps) ||
    failedSteps.length > LOCAL_REPORT_STEP_IDS.length ||
    new Set(failedSteps).size !== failedSteps.length ||
    !failedSteps.every((s) => (LOCAL_REPORT_STEP_IDS as readonly unknown[]).includes(s))
  )
    throw new Error("failedSteps が不正です");
  let tests: LocalRunReport["tests"] = null;
  if (body.tests !== undefined && body.tests !== null) {
    const t = body.tests as Record<string, unknown>;
    if (typeof t !== "object" || !count(t.passed) || !count(t.failed))
      throw new Error("tests が不正です");
    tests = { passed: t.passed, failed: t.failed };
  }
  return {
    taskId: body.taskId,
    contentHash: body.contentHash,
    outcome,
    failedSteps: failedSteps as RunStepId[],
    tests,
  };
}
