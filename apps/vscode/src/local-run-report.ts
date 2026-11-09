/**
 * 手元の確認の要約を LMS に送る。本文は `@stella/shared/tasks/local-report` が作り、
 * コード・ファイル名・メッセージは載せない。拡張と CLI が同じ関数を使う。
 */

import { toLocalRunReport } from "@stella/shared/tasks/local-report";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { apiRequest } from "./api.js";

export async function sendLocalRunReport(
  result: Pick<RunResult, "outcome" | "steps">,
  receipt: { taskId: string; contentHash: string } | undefined,
): Promise<void> {
  if (!receipt) return;
  const report = toLocalRunReport(result, receipt);
  if (!report) return;
  await apiRequest(
    report.outcome === "passed" ? "/api/tasks/local-result" : "/api/tasks/local-runs",
    { method: "POST", body: report },
  );
}
