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
  /** 面談予定日 (参考情報)。未設定なら null。 */
  interviewDate?: string | null;
  note?: string | null;
}

export async function fetchInterviewQuestions(): Promise<InterviewQuestionsResult> {
  return apiFetch<InterviewQuestionsResult>("/api/interview-prep/questions");
}

export interface InterviewPrepAssignmentRow {
  profile_id: string;
  display_name: string;
  email: string | null;
  categories: string[];
  interviewDate?: string | null;
  note?: string | null;
}

/** 面談予定日昇順 → 未設定は display_name 順で末尾 (GET /assignments と同じ)。 */
export function sortInterviewPrepAssignmentRows(
  rows: InterviewPrepAssignmentRow[],
): InterviewPrepAssignmentRow[] {
  const dated = rows
    .filter((r) => r.interviewDate)
    .sort((a, b) => String(a.interviewDate).localeCompare(String(b.interviewDate)));
  const undated = rows
    .filter((r) => !r.interviewDate)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  return [...dated, ...undated];
}

export async function listInterviewPrepAssignments(): Promise<InterviewPrepAssignmentRow[]> {
  const { rows } = await apiFetch<{ rows: InterviewPrepAssignmentRow[] }>(
    "/api/interview-prep/assignments",
  );
  return sortInterviewPrepAssignmentRows(rows ?? []);
}

export async function saveInterviewPrepAssignment(
  profileId: string,
  payload: {
    categories: string[];
    interviewDate?: string | null;
    note?: string | null;
  },
): Promise<void> {
  await apiFetch(`/api/interview-prep/assignments/${encodeURIComponent(profileId)}`, {
    method: "PUT",
    body: payload,
  });
}
