/**
 * 講師のレビュー画面の API (#34)。staff だけが呼べる (サーバーが確かめる)。
 *
 * 人に回した提出のキューは提出物ストア (`GET /api/submissions`) が持つ。ここは事後確認・
 * 見直しの数字・同じ課題の並べ見・コメント集を呼ぶ。
 */

import type {
  AiPassedRow,
  AiPassedState,
  CheckAction,
  ReviewCommentTemplate,
  ReviewMetrics,
  SubmissionCheckRecord,
  TaskBoard,
} from "@stella/shared/review/review-desk";
import { apiFetch } from "./api-client";

export interface AiPassedQuery {
  stageId?: string;
  taskId?: string;
  learnerId?: string;
  confidence?: "high" | "medium";
  from?: string;
  to?: string;
  state?: AiPassedState;
  assignedOnly?: boolean;
}

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** AI が合格にした提出の一覧 (確信度が中を先に)。 */
export async function fetchAiPassed(
  query: AiPassedQuery,
  signal?: AbortSignal,
): Promise<{ rows: AiPassedRow[]; truncated: boolean }> {
  const { assignedOnly, ...rest } = query;
  return apiFetch(
    `/api/review-desk/ai-passed${queryString({ ...rest, assigned: assignedOnly ? "mine" : undefined })}`,
    signal ? { signal } : {},
  );
}

/** 確認済みにする・コメントを足す・再提出に覆す。 */
export async function checkSubmission(
  submissionId: string,
  action: CheckAction,
  comment: string,
): Promise<SubmissionCheckRecord[]> {
  const { checks } = await apiFetch<{ checks: SubmissionCheckRecord[] }>(
    `/api/submissions/${encodeURIComponent(submissionId)}/checks`,
    { method: "POST", body: { action, comment } },
  );
  return checks;
}

export async function fetchReviewMetrics(days: number, signal?: AbortSignal) {
  return apiFetch<ReviewMetrics>(`/api/review-desk/metrics?days=${days}`, signal ? { signal } : {});
}

export async function fetchTaskBoard(taskId: string, assignedOnly: boolean, signal?: AbortSignal) {
  return apiFetch<TaskBoard>(
    `/api/review-desk/task-board${queryString({ taskId, assigned: assignedOnly ? "mine" : undefined })}`,
    signal ? { signal } : {},
  );
}

/** 共通のつまずきを発見教材の待ち行列に回す (下書きは発見教材の画面で作る)。 */
export async function routeToDiscovery(taskId: string, rubricId: string | null) {
  return apiFetch<{ topic: string; stageId: string }>("/api/review-desk/task-board/discovery", {
    method: "POST",
    body: { taskId, rubricId },
  });
}

export async function fetchTemplates(scope: { stageId?: string | null; pattern?: string | null }) {
  const { templates } = await apiFetch<{ templates: ReviewCommentTemplate[] }>(
    `/api/review-templates${queryString({
      stageId: scope.stageId ?? undefined,
      pattern: scope.pattern ?? undefined,
    })}`,
  );
  return templates;
}

export interface TemplateInput {
  stageId?: string | null;
  pattern?: string | null;
  ruleId?: string | null;
  violation: string;
  body: string;
}

export async function createTemplate(input: TemplateInput) {
  const { template } = await apiFetch<{ template: ReviewCommentTemplate }>(
    "/api/review-templates",
    { method: "POST", body: input },
  );
  return template;
}

export async function updateTemplate(id: string, input: Partial<TemplateInput>) {
  const { template } = await apiFetch<{ template: ReviewCommentTemplate }>(
    `/api/review-templates/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input },
  );
  return template;
}

export async function deleteTemplate(id: string) {
  await apiFetch(`/api/review-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}
