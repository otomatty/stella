/**
 * 面談対策 (Interview Prep) のデータアクセス層。 認可はサーバ側:
 *   - 受講者: 割当カテゴリ + 共通の質問のみ返る
 *   - staff: 全件 + 割当の read/write
 */

import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { apiFetch } from "./api-client";

export interface InterviewQuestionsResult {
  rows: InterviewQuestion[];
  /** 受講者: 自分の割当。 staff: 全カテゴリ。 */
  assignedCategories: string[];
}

export async function fetchInterviewQuestions(): Promise<InterviewQuestionsResult> {
  return apiFetch<InterviewQuestionsResult>("/api/interview-prep/questions");
}

export interface InterviewPrepAssignmentRow {
  profile_id: string;
  display_name: string;
  email: string | null;
  categories: string[];
}

export async function listInterviewPrepAssignments(): Promise<
  InterviewPrepAssignmentRow[]
> {
  const { rows } = await apiFetch<{ rows: InterviewPrepAssignmentRow[] }>(
    "/api/interview-prep/assignments",
  );
  return rows ?? [];
}

export async function saveInterviewPrepAssignment(
  profileId: string,
  categories: string[],
): Promise<void> {
  await apiFetch(
    `/api/interview-prep/assignments/${encodeURIComponent(profileId)}`,
    { method: "PUT", body: { categories } },
  );
}
