/**
 * 面談対策 (Interview Prep) のデータアクセス層。 認可はサーバ側:
 *   - 受講者: 割当カテゴリ + 共通の質問のみ返る
 *   - staff: 全件 + 割当の read/write
 */

import type { InterviewQuestion } from "@falcon/shared/interview/types";
import type { InterviewAudioPart } from "@falcon/shared/interview/audio";
import type { FixNote } from "@falcon/shared/interview/fix-notes";
import { apiFetch, apiFetchRaw } from "./api-client";

/** 受講者向け GET /questions の行 (個別回答の型 + 学習ステータス付き)。 */
export type LearnerInterviewQuestion = InterviewQuestion & {
  personal_answer_template?: string | null;
  draft_answer_template?: string | null;
  has_pending_draft?: boolean;
  /** interview_progress の保存値。 行なし (未着手) は null。 */
  progress_status?: "read" | "confident" | null;
  practiced_count?: number;
  /** 改善点メモ (未解決・解決済みの両方。 Issue #234)。 */
  fix_notes?: FixNote[];
  /** SM-2 の次回出題日 (`YYYY-MM-DD`)。 未練習は null (Issue #235)。 */
  srs_due_date?: string | null;
  /** 最後の自己評価。 `again` は次のセットで最優先に再登場する。 */
  last_result?: "again" | "good" | null;
};

/** 学習ステータスの更新イベント (PUT /progress/:no の body.event)。 */
export type ProgressEvent = "read" | "practiced" | "confident";

/** `PUT /progress/:no` の戻り値。 */
export interface ProgressResult {
  ok: boolean;
  /** SM-2 の次回出題日。 「型を読んだ」は null。 */
  due_date: string | null;
  interval_days: number | null;
  /** 更新後のセット (setId を渡した場合)。 */
  set: PracticeSet | null;
  /**
   * セットへ記録できたか。 `setId` を渡したのに false のときは、 競合や別タブでの終了で
   * その 1 問が記録されていない — 呼び出し側は楽観更新を戻してやり直させる。
   */
  set_recorded: boolean;
}

/**
 * 受講者本人のみ。 read=型を読んだ / practiced=もう一度 / confident=できた。
 * `setId` を渡すと「今日の練習セット」の消化としても記録される (Issue #235)。
 */
export async function reportInterviewProgress(
  no: number,
  event: ProgressEvent,
  setId?: string | null,
): Promise<ProgressResult> {
  const r = await apiFetch<ProgressResult>(`/api/interview-prep/progress/${no}`, {
    method: "PUT",
    body: setId ? { event, setId } : { event },
  });
  // 旧レスポンス互換: フィールドが無ければ記録できたものとして扱う。
  return { ...r, set_recorded: r.set_recorded !== false };
}

/** 進行中セットの要約 (準備ホームの「途中のセットを再開」)。 */
export interface ActiveSetSummary {
  id: string;
  date: string;
  total: number;
  completed: number;
  remaining: number;
}

/** GET /practice-set が返すセット (`serializePracticeSet`)。 */
export interface PracticeSet {
  id: string;
  date: string;
  question_nos: number[];
  completed_nos: number[];
  confident_nos: number[];
  started_percent: number;
  status: "active" | "done";
  total: number;
  completed: number;
  remaining: number;
  next_no: number | null;
  finished: boolean;
}

export interface PracticeSetResult {
  /** 出題対象が 0 問 (割当前) なら null。 */
  set: PracticeSet | null;
  /** 中断していたセットの再開か。 */
  resumed: boolean;
  rows: LearnerInterviewQuestion[];
  prepPercent: number;
}

/** 今日の練習セットを開始 / 再開する (SM-2 で 10 問を選定)。 */
export async function startPracticeSet(): Promise<PracticeSetResult> {
  const r = await apiFetch<PracticeSetResult>("/api/interview-prep/practice-set");
  return { ...r, rows: r.rows ?? [] };
}

/** セット終了サマリ (できた n/10 と準備率の伸び)。 */
export interface PracticeSetSummary {
  total: number;
  confident: number;
  again: number;
  skipped: number;
  startedPercent: number;
  currentPercent: number;
  gainedPercent: number;
}

/** セットを終了してサマリを受け取る (全問終えた場合も途中で切り上げた場合も同じ)。 */
export async function finishPracticeSet(
  id: string,
): Promise<{ set: PracticeSet; summary: PracticeSetSummary }> {
  return apiFetch<{ set: PracticeSet; summary: PracticeSetSummary }>(
    `/api/interview-prep/practice-set/${encodeURIComponent(id)}`,
    { method: "PUT", body: { status: "done" } },
  );
}

export interface InterviewQuestionsResult {
  rows: LearnerInterviewQuestion[];
  /** 受講者: 自分の割当。 staff: 全カテゴリ。 */
  assignedCategories: string[];
  /** 読み上げ音声が登録済みの質問番号 (admin が事前生成)。 */
  audioNos: number[];
  /** 音声が登録済みのセグメント (`12:question` / `12:deep1`)。 深掘りを含む。 */
  audioSegments: string[];
  /** 面談予定日 (参考情報)。未設定なら null。 */
  interviewDate?: string | null;
  note?: string | null;
  /** 中断中の練習セット (Issue #235)。 無ければ null。 */
  activeSet?: ActiveSetSummary | null;
}

export async function fetchInterviewQuestions(
  profileId?: string | null,
): Promise<InterviewQuestionsResult> {
  const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
  const r = await apiFetch<InterviewQuestionsResult>(`/api/interview-prep/questions${query}`);
  return { ...r, audioNos: r.audioNos ?? [], audioSegments: r.audioSegments ?? [] };
}

/** 読み上げ音声 (MP3)。 深掘りは part で指定する。 未登録は 404 → ApiClientError。 */
export async function fetchQuestionAudio(
  no: number,
  part: InterviewAudioPart = "question",
): Promise<Blob> {
  const query = part === "question" ? "" : `?part=${part}`;
  const res = await apiFetchRaw(`/api/interview-prep/questions/${no}/audio${query}`);
  return res.blob();
}

/** 改善点メモを 1 行追加する (受講者本人のみ)。 */
export async function addFixNote(questionNo: number, text: string): Promise<FixNote> {
  const { note } = await apiFetch<{ note: FixNote }>(
    `/api/interview-prep/fix-notes/${questionNo}`,
    { method: "POST", body: { text } },
  );
  return note;
}

/** 改善点メモの消し込み / 取り消し。 */
export async function setFixNoteResolved(id: string, resolved: boolean): Promise<FixNote> {
  const { note } = await apiFetch<{ note: FixNote }>(
    `/api/interview-prep/fix-notes/${encodeURIComponent(id)}`,
    { method: "PUT", body: { resolved } },
  );
  return note;
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

export interface AudioSegmentRef {
  no: number;
  part: InterviewAudioPart;
}

export interface GenerateAudioResult {
  results: Array<{ no: number; part: InterviewAudioPart; ok: boolean; error?: string }>;
}

/**
 * admin: 指定セグメント (質問文 + 深掘り①〜③) の読み上げ音声を生成 (再生成は上書き)。
 * 1 回最大 10 セグメント。
 */
export async function generateQuestionAudio(
  segments: AudioSegmentRef[],
): Promise<GenerateAudioResult> {
  return apiFetch<GenerateAudioResult>("/api/interview-prep/audio/generate", {
    method: "POST",
    body: { segments },
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
