/**
 * 手元の確認の要約を LMS に送る。本文は `@stella/shared/tasks/local-report` が作り、
 * コード・ファイル名・メッセージは載せない。
 */

import { toLocalRunReport } from "@stella/shared/tasks/local-report";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { apiRequest, apiSession } from "./api.js";

const LOCAL_RUN_REPORT_TIMEOUT_MS = 15_000;
let pendingReport: Promise<unknown> = Promise.resolve();

export async function sendLocalRunReport(
  result: Pick<RunResult, "outcome" | "steps">,
  receipt: { taskId: string; contentHash: string } | undefined,
): Promise<void> {
  if (!receipt) return;
  const report = toLocalRunReport(result, receipt);
  if (!report) return;
  // 待っている間に接続が切り替わっても、別の受講者として送らない。
  const session = apiSession();
  const sending = pendingReport.then(() =>
    apiRequest(report.outcome === "passed" ? "/api/tasks/local-result" : "/api/tasks/local-runs", {
      method: "POST",
      body: report,
      signal: AbortSignal.timeout(LOCAL_RUN_REPORT_TIMEOUT_MS),
      session,
    }),
  );
  pendingReport = sending.catch(() => undefined);
  await sending;
}
