/**
 * 面談対策 (Interview Prep) のデータアクセス層。 認可はサーバ側:
 *   - 受講者: 割当カテゴリ + 共通の質問のみ返る
 *   - staff: 全件 + 割当の read/write
 */

import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { apiFetch } from "./api-client";

/** 受講者向け GET /questions の行 (個別回答の型フィールド付き)。 */
export type LearnerInterviewQuestion = InterviewQuestion & {
  personal_answer_template?: string | null;
  draft_answer_template?: string | null;
  has_pending_draft?: boolean;
};

export interface InterviewQuestionsResult {
  rows: LearnerInterviewQuestion[];
  /** 受講者: 自分の割当。 staff: 全カテゴリ。 */
  assignedCategories: string[];
  /** 面談予定日 (参考情報)。未設定なら null。 */
  interviewDate?: string | null;
  note?: string | null;
}

export async function fetchInterviewQuestions(
  profileId?: string | null,
): Promise<InterviewQuestionsResult> {
  const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
  return apiFetch<InterviewQuestionsResult>(`/api/interview-prep/questions${query}`);
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

export async function savePersonalAnswerTemplate(
  profileId: string,
  questionNo: number,
  content: string,
): Promise<void> {
  await apiFetch(
    `/api/interview-prep/answer-templates/${encodeURIComponent(profileId)}/${questionNo}`,
    {
      method: "PUT",
      body: { content },
    },
  );
}

export async function adoptPersonalAnswerTemplateDraft(
  profileId: string,
  questionNo: number,
): Promise<void> {
  await apiFetch(
    `/api/interview-prep/answer-templates/${encodeURIComponent(profileId)}/${questionNo}/adopt-draft`,
    { method: "POST" },
  );
}
