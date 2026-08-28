/**
 * 「講師に引き継ぐ」 (Issue #9)。
 *
 * 自動採点で詰まった学習者が、 その場の提出コードと採点失敗サマリを添えて
 * `POST /api/submissions` する。 レッスン完了にはしない (完了は自動採点クリアのまま)。
 */

import { getEntryFile } from "@falcon/shared/assignment-helpers";
import { buildEscalationSubmissionBody } from "@falcon/shared/review/escalation";
import { buildGradingSummary } from "@falcon/shared/review/grading-summary";
import type { Assignment } from "@falcon/shared/types";
import { apiRequest } from "./api.js";
import type { ExecutionResult } from "./grader-protocol.js";

/** 直近の採点 1 回ぶん。 引き継ぎは「採点した内容」を送るので、 採点時に控える。 */
export interface EscalationAttempt {
  assignment: Assignment;
  files: Record<string, string>;
  result: ExecutionResult;
  stageId: string;
  stageTitle: string;
  lessonId: string;
  sectionTitle: string | null;
}

let lastAttempt: EscalationAttempt | undefined;

export function rememberEscalationAttempt(attempt: EscalationAttempt): void {
  lastAttempt = attempt;
}

export function clearEscalationAttempt(): void {
  lastAttempt = undefined;
}

/** 引き継げるのは「直近に採点して未クリアだった課題」だけ。 */
export function getEscalationAttempt(assignmentId: string): EscalationAttempt | undefined {
  if (!lastAttempt) return undefined;
  if (lastAttempt.assignment.id !== assignmentId) return undefined;
  if (lastAttempt.result.evaluation.cleared) return undefined;
  return lastAttempt;
}

export function canEscalate(assignmentId: string | undefined): boolean {
  return assignmentId !== undefined && getEscalationAttempt(assignmentId) !== undefined;
}

interface SubmissionResponse {
  row: { id: string; attempt: number };
}

/**
 * 直近の採点結果を講師の添削キューへ送る。
 * 同一課題の未添削が残っていればサーバ側で上書きされる (キューを増殖させない)。
 */
export async function escalateToInstructor(assignmentId: string): Promise<number> {
  const attempt = getEscalationAttempt(assignmentId);
  if (!attempt) {
    throw new Error("採点して未クリアだった課題がありません。 先に採点を実行してください");
  }
  const body = buildEscalationSubmissionBody({
    lessonId: attempt.lessonId,
    assignmentId: attempt.assignment.id,
    stageTitle: attempt.stageTitle,
    sectionTitle: attempt.sectionTitle,
    assignmentTitle: attempt.assignment.title,
    files: attempt.files,
    entryFile: getEntryFile(attempt.assignment),
    gradingSummary: buildGradingSummary(attempt.result, attempt.assignment.language),
  });
  const res = await apiRequest<SubmissionResponse>("/api/submissions", {
    method: "POST",
    body,
  });
  return res.row.attempt;
}
