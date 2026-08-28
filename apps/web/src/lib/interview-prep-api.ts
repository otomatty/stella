/**
 * 面談対策 (Interview Prep) のデータアクセス層。 認可はサーバ側:
 *   - 受講者: 割当カテゴリ + 共通の質問のみ返る
 *   - staff: 全件 + 割当の read/write
 */

import type { ProfileRole } from "@falcon/shared/cms/types";
import type { InterviewQuestion } from "@falcon/shared/interview/types";
import type { InterviewQuestionPatch } from "@falcon/shared/interview/edit";
import type { FixNote } from "@falcon/shared/interview/fix-notes";
import { type MonitoringSummary, sortByInterviewDate } from "@falcon/shared/interview/monitoring";
import { toStudyDate } from "@falcon/shared/study/activity";
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
  /**
   * 登録済みだが質問文と食い違う音声の質問番号 (Issue #237)。 質問文を直したあと
   * 読み上げの作り直しに失敗した場合などに入る。
   */
  audioStaleNos: number[];
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
  return {
    ...r,
    audioNos: r.audioNos ?? [],
    audioStaleNos: r.audioStaleNos ?? [],
  };
}

/** staff 一覧の行 (`attachEditMarks`)。 誰がいつ直したかが付く。 */
export type StaffInterviewQuestion = InterviewQuestion & {
  edited_at?: string | null;
  edited_by?: string | null;
  /**
   * 「正本の管理に戻す」の予約 (Issue #237)。 入っていても本文はまだ編集後のままで、
   * 次の配信 (seed) で正本へ戻る。 それまでは編集済みとして扱う。
   */
  release_requested_at?: string | null;
};

/** 質問編集で音声に何が起きたか (`syncQuestionAudio` の戻り)。 */
/** 編集を保存したとき、 その質問の読み上げ音声に何が起きたか。 */
export interface QuestionAudioSync {
  /** 新しい質問文で作り直せた。 */
  regenerated: boolean;
  /** 質問文は変わったが音声が追いついていない。 管理画面から手で生成できる。 */
  stale: boolean;
  reason: string | null;
}

export interface UpdateQuestionResult {
  row: StaffInterviewQuestion;
  edited_at: string | null;
  edited_by: string | null;
  audio: QuestionAudioSync;
}

/**
 * admin / sales: 想定質問 1 件を編集する。 質問文が変わっていれば読み上げ音声は
 * サーバ側で作り直され、 結果が `audio` に入る (呼び出し側で生成し直す必要はない)。
 */
export async function updateInterviewQuestion(
  no: number,
  patch: InterviewQuestionPatch,
): Promise<UpdateQuestionResult> {
  return apiFetch<UpdateQuestionResult>(`/api/interview-prep/questions/${no}`, {
    method: "PATCH",
    body: patch,
  });
}

/**
 * 質問を正本 (questions.json) の管理下へ戻すよう予約する。
 *
 * その場で本文は戻らない (API は questions.json を持たない) ので、 編集済みの印も
 * 残したままにする — 印を先に外すと、 編集後の本文に編集前の読み上げ音声が
 * 付いてしまう。 次の配信 (seed) が本文を書き戻すときに印ごと落ちる。
 */
export async function releaseInterviewQuestionEdit(no: number): Promise<string | null> {
  const r = await apiFetch<{ release_requested_at?: string | null }>(
    `/api/interview-prep/questions/${no}/edit-mark`,
    { method: "DELETE" },
  );
  return r.release_requested_at ?? null;
}

/** 読み上げ音声 (MP3)。 1 質問 1 音声。 未登録は 404 → ApiClientError。 */
export async function fetchQuestionAudio(no: number): Promise<Blob> {
  const res = await apiFetchRaw(`/api/interview-prep/questions/${no}/audio`);
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

export interface GenerateAudioResult {
  results: Array<{ no: number; ok: boolean; error?: string }>;
}

/** 生成 API の失敗行を管理画面のトースト / コンソール向けに整形する。 */
export function formatAudioGenerateErrors(results: GenerateAudioResult["results"]): string {
  return results
    .filter((r) => !r.ok)
    .map((r) => `No.${r.no}: ${r.error?.trim() || "不明なエラー"}`)
    .join("\n");
}

/** admin: 指定した質問の読み上げ音声を生成 (再生成は上書き)。 1 回最大 10 問。 */
export async function generateQuestionAudio(
  nos: number[],
  model?: string,
): Promise<GenerateAudioResult> {
  return apiFetch<GenerateAudioResult>("/api/interview-prep/audio/generate", {
    method: "POST",
    body: { nos, ...(model ? { model } : {}) },
  });
}

export interface InterviewPrepAssignmentRow {
  profile_id: string;
  display_name: string;
  email: string | null;
  /**
   * 対象者のロール。 面談対策は受講者のほか管理者も同じ内容を練習するので、
   * 一覧に受講者以外が並ぶ (行の見分けが付くよう UI でバッジにする)。
   */
  role?: ProfileRole;
  categories: string[];
  interviewDate?: string | null;
  note?: string | null;
  /** 準備率 (%) — 割当範囲の A 必修のうち「練習OK」の割合 (Issue #236)。 */
  prepRate?: number;
  /** 準備率の分母 (A 必修の問題数)。 割当前は 0。 */
  prepTotal?: number;
  /** 4 状態の内訳 (合計は prepTotal に一致する)。 */
  breakdown?: { confident: number; drafted: number; read: number; none: number };
  /** 最終練習日時 (ISO)。 一度も練習していなければ null。 */
  lastPracticedAt?: string | null;
}

/**
 * モニタリング一覧の集計 (`monitoringRisk` などに渡す形)。
 * 集計が無い行 (再集計待ち / 未同梱の旧レスポンス) は 0% ではなく「未算出」として渡す。
 */
export function monitoringSummaryOf(row: InterviewPrepAssignmentRow): MonitoringSummary {
  return {
    interviewDate: row.interviewDate ?? null,
    prepPercent: row.prepRate ?? null,
    lastPracticedAt: row.lastPracticedAt ?? null,
  };
}

/**
 * モニタリング一覧に並べる行を選ぶ。
 *
 * 受講者は割当前でも並べる — 「まだ割り当てていない」こと自体が講師・営業への合図
 * なので、 一覧から消してはいけない。 一方、 面談対策の対象に加わった管理者は
 * 割当も面談予定も無いあいだは外す: 全管理者が「練習なし」として常時並ぶと、
 * 受講者の準備状況を追うというこの一覧の役目が薄まるため。 割り当てた時点で
 * (あるいは面談予定が入った時点で) 受講者と同じように並ぶ。
 */
export function monitoringRowsOf(rows: InterviewPrepAssignmentRow[]): InterviewPrepAssignmentRow[] {
  return rows.filter(
    (row) =>
      row.role === undefined ||
      row.role === "student" ||
      row.categories.length > 0 ||
      (row.interviewDate ?? null) !== null,
  );
}

/**
 * 割当保存の楽観更新 (一覧の即時反映)。
 *
 * **カテゴリを変えたら集計値を落とす**のが要点: 準備率の分母は「割当範囲の A 必修」
 * なので、 PHP → Java のように割当を変えると準備率・内訳はサーバで計算し直すまで
 * 分からない。 古い値を残すと案件・割当だけ新しく、 準備率は旧割当のまま —— という
 * 食い違いが (再読込するまで) 居座る。 落としたぶんは保存成功後の再取得で埋める。
 * 最終練習日は割当に依存しないのでそのまま残す。
 */
export function applyAssignmentSave(
  rows: InterviewPrepAssignmentRow[],
  profileId: string,
  patch: { categories?: string[]; interviewDate?: string | null; note?: string | null },
  today: string = toStudyDate(Date.now()),
): InterviewPrepAssignmentRow[] {
  return sortInterviewPrepAssignmentRows(
    rows.map((row) => {
      if (row.profile_id !== profileId) return row;
      const next: InterviewPrepAssignmentRow = { ...row };
      if (patch.categories !== undefined) {
        const changed = !sameCategories(row.categories, patch.categories);
        next.categories = patch.categories;
        if (changed) {
          next.prepRate = undefined;
          next.prepTotal = undefined;
          next.breakdown = undefined;
        }
      }
      if (patch.interviewDate !== undefined) next.interviewDate = patch.interviewDate;
      if (patch.note !== undefined) next.note = patch.note;
      return next;
    }),
    today,
  );
}

/**
 * 楽観更新の取り消し。 保存が失敗したら、 その行を保存前の姿へそのまま戻す。
 *
 * `applyAssignmentSave` で戻そうとすると「割当がまた変わった」と見なされて集計値が
 * 落ちたままになる (この経路には再取得が続かないので「集計中…」で固まる)。 サーバは
 * 何も変えていないのだから、 集計値も含めて元の行をそのまま復元するのが正しい。
 */
export function restoreAssignmentRow(
  rows: InterviewPrepAssignmentRow[],
  original: InterviewPrepAssignmentRow,
  today: string = toStudyDate(Date.now()),
): InterviewPrepAssignmentRow[] {
  return sortInterviewPrepAssignmentRows(
    rows.map((row) => (row.profile_id === original.profile_id ? original : row)),
    today,
  );
}

/**
 * 再取得した一覧から **集計値だけ** を取り込む。
 *
 * 一覧をまるごと差し替えると、 再取得が飛んでいる最中に別の行で保存した面談日・メモ・
 * 割当が、 その保存より前に読まれたスナップショットで巻き戻る (画面だけサーバと食い違う)。
 * この再取得の目的はサーバでしか出せない集計を貰うことなので、 利用者が編集する値
 * (categories / interviewDate / note) には触らない。
 *
 * サーバの割当がこちらと食い違う行は、 もっと新しい保存が進行中ということ。 その集計は
 * 別の割当に対する値なので取り込まず、 未算出のままにする (その保存の再取得が正しい値を運ぶ)。
 */
export function mergeAssignmentAggregates(
  current: InterviewPrepAssignmentRow[],
  fetched: InterviewPrepAssignmentRow[],
): InterviewPrepAssignmentRow[] {
  const byProfile = new Map(fetched.map((r) => [r.profile_id, r]));
  return current.map((row) => {
    const server = byProfile.get(row.profile_id);
    if (!server || !sameCategories(row.categories, server.categories)) return row;
    return {
      ...row,
      prepRate: server.prepRate,
      prepTotal: server.prepTotal,
      breakdown: server.breakdown,
      lastPracticedAt: server.lastPracticedAt,
    };
  });
}

/** 割当カテゴリの同値判定 (順序は問わない)。 */
function sameCategories(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort();
  return [...a].sort().every((v, i) => v === sortedB[i]);
}

/** 「面談が近い順」: これから → 済んだ面談 → 未設定 (GET /assignments と同じ)。 */
export function sortInterviewPrepAssignmentRows(
  rows: InterviewPrepAssignmentRow[],
  today: string = toStudyDate(Date.now()),
): InterviewPrepAssignmentRow[] {
  return sortByInterviewDate(rows, today);
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
