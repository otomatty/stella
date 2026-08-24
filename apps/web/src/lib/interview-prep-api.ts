/**
 * 面談対策 (Interview Prep) のデータアクセス層。 認可はサーバ側:
 *   - 受講者: 割当カテゴリ + 共通の質問のみ返る
 *   - staff: 全件 + 割当の read/write
 */

import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { apiFetch, apiFetchRaw } from "./api-client";

/** 受講者向け GET /questions の行 (個別回答の型 + 学習ステータス付き)。 */
export type LearnerInterviewQuestion = InterviewQuestion & {
  personal_answer_template?: string | null;
  draft_answer_template?: string | null;
  has_pending_draft?: boolean;
  /** interview_progress の保存値。 行なし (未着手) は null。 */
  progress_status?: "read" | "confident" | null;
  practiced_count?: number;
};

/** 学習ステータスの更新イベント (PUT /progress/:no の body.event)。 */
export type ProgressEvent = "read" | "practiced" | "confident";

/** 受講者本人のみ。 read=型を読んだ / practiced=もう一度 / confident=できた。 */
export async function reportInterviewProgress(no: number, event: ProgressEvent): Promise<void> {
  await apiFetch(`/api/interview-prep/progress/${no}`, {
    method: "PUT",
    body: { event },
  });
}

export interface InterviewQuestionsResult {
  rows: LearnerInterviewQuestion[];
  /** 受講者: 自分の割当。 staff: 全カテゴリ。 */
  assignedCategories: string[];
  /** 読み上げ音声が登録済みの質問番号 (admin が事前生成)。 */
  audioNos: number[];
  /** 面談予定日 (参考情報)。未設定なら null。 */
  interviewDate?: string | null;
  note?: string | null;
}

export async function fetchInterviewQuestions(
  profileId?: string | null,
): Promise<InterviewQuestionsResult> {
  const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
  const r = await apiFetch<InterviewQuestionsResult>(`/api/interview-prep/questions${query}`);
  return { ...r, audioNos: r.audioNos ?? [] };
}

/** 質問の読み上げ音声 (MP3)。 未登録は 404 → ApiClientError。 */
export async function fetchQuestionAudio(no: number): Promise<Blob> {
  const res = await apiFetchRaw(`/api/interview-prep/questions/${no}/audio`);
  return res.blob();
}

export interface TranscribeResult {
  transcript: string;
  durationSec: number | null;
}

/** 練習録音を Whisper で文字起こしする。 質問番号を渡すと認識精度が上がる。 */
export async function transcribeRecording(no: number, audio: Blob): Promise<TranscribeResult> {
  const res = await apiFetchRaw(`/api/interview-prep/transcribe?no=${no}`, {
    method: "POST",
    body: audio,
    contentType: audio.type || "application/octet-stream",
  });
  return (await res.json()) as TranscribeResult;
}

export interface GenerateAudioResult {
  results: Array<{ no: number; ok: boolean; error?: string }>;
}

/** admin: 指定質問の読み上げ音声を生成 (再生成は上書き)。 1 回最大 10 問。 */
export async function generateQuestionAudio(nos: number[]): Promise<GenerateAudioResult> {
  return apiFetch<GenerateAudioResult>("/api/interview-prep/audio/generate", {
    method: "POST",
    body: { nos },
  });
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
