/**
 * 面談対策 (Interview Prep) API。
 *
 * アプリ層認可:
 *   - 受講者: 割当カテゴリ + 全案件共通の質問のみ read
 *   - canPracticeInterviewPrep (受講者/admin/platform_admin): 自分の練習 (割当・進捗・メモ) の対象
 *   - canManageInterviewPrep (instructor/admin/platform_admin/sales): 質問全件 read、 割当の read/write
 *   - interviewDate / note の write: sales/admin/platform_admin のみ (Issue #205)
 */

import { Hono } from "hono";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { ASSIGNABLE_CATEGORIES, isAssignableCategory } from "@falcon/shared/interview/types";
import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { visibleQuestions } from "@falcon/shared/interview/filter";
import {
  INTERVIEW_AUDIO_TEXT_HASH_KEY,
  interviewAudioObjectName,
  interviewAudioTextHash,
  isInterviewAudioStale,
  isInterviewTtsModelId,
  parseInterviewAudioObjectName,
} from "@falcon/shared/interview/audio";
import {
  InterviewQuestionPatchError,
  type InterviewQuestionPatch,
  questionAudioChanged,
  normalizeInterviewQuestionPatch,
} from "@falcon/shared/interview/edit";
import {
  FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION,
  normalizeFixNoteText,
} from "@falcon/shared/interview/fix-notes";
import {
  PRACTICE_SET_SIZE,
  type PracticeCandidate,
  practiceSetProgress,
  summarizePracticeSet,
} from "@falcon/shared/interview/practice-set";
import { deriveQuestionPrepStatus, prepRate } from "@falcon/shared/interview/progress";
import { sortByInterviewDate } from "@falcon/shared/interview/monitoring";
import { toStudyDate } from "@falcon/shared/study/activity";

import {
  interviewFixNotes,
  interviewPrepAssignments,
  interviewProgress,
  interviewQuestions,
  notifications,
  profiles,
} from "../db/schema.js";
import {
  type InterviewProgressState,
  finishPracticeSet,
  loadActivePracticeSet,
  loadInterviewProgress,
  nextInterviewSrs,
  type PracticeSetRow,
  recordPracticeSetAnswer,
  startOrResumePracticeSet,
} from "../lib/interview-practice-set.js";
import {
  ApiError,
  errorResponse,
  getCaller,
  INTERVIEW_PREP_PRACTICE_ROLES,
  canManageInterviewPrep,
  canPracticeInterviewPrep,
  canWriteInterviewSchedule,
  requireCanEditInterviewQuestions,
  requireCanManageInterviewPrep,
  requireCanPracticeInterviewPrep,
  requireRole,
} from "../lib/authz.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";
import { interviewQuestionLockId, withResourceLock } from "../lib/resource-lock.js";
import {
  AI_REQUEST_TIMEOUT_MS,
  synthesizeSpeech,
  transcribeAudio,
  workersAiConfigured,
} from "../lib/workers-ai.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import {
  adoptPersonalTemplateDraft,
  enrichQuestionRows,
  loadPersonalTemplatesByQuestion,
  upsertPersonalAnswerTemplate,
} from "../lib/interview-answer-template-db.js";
import { plainCommonAnswerTemplate } from "../lib/interview-answer-template.js";
import {
  EMPTY_INTERVIEW_PREP_SUMMARY,
  loadInterviewPrepSummaries,
} from "../lib/interview-monitoring.js";
import type { Env } from "../env.js";

export const interviewPrepRoute = new Hono<{ Bindings: Env }>();

const Q_SELECT = {
  no: interviewQuestions.no,
  categories: interviewQuestions.categories,
  subcategory: interviewQuestions.subcategory,
  freq: interviewQuestions.freq,
  question: interviewQuestions.question,
  time: interviewQuestions.time,
  keywords: interviewQuestions.keywords,
  intent: interviewQuestions.intent,
  answer_template: interviewQuestions.answerTemplate,
  ng: interviewQuestions.ng,
  criteria: interviewQuestions.criteria,
  is_reverse: interviewQuestions.isReverse,
} as const;

/**
 * 質問音声の R2 プレフィックス。 教材の `tenant/<id>/` 配下ではないため
 * 孤児掃除 (`/api/admin/r2/orphans`) の走査対象にならない。
 *
 * **キーはテナント別** (`interview-tts/<tenant>/<no>.mp3`)。 以前は質問データが
 * 全テナント共通の正本 (questions.json seed) だったのでキーは質問番号だけで足りたが、
 * 画面から質問を直せるようになった (Issue #237) 以上、 文面はテナントごとに違いうる。
 * 共通キーのままだと、 あるテナントの再生成が別テナントの音声を上書き / 削除して
 * しまい、 別の文面の読み上げが受講者に流れる。
 */
const TTS_PREFIX = "interview-tts";

/**
 * 質問ロックの保持時間。 **中で走る処理の所要時間より長いこと** が直列化の前提。
 *
 * 1 つのロックの中を一番長く走るのは質問編集で、 質問文の合成 1 回 + R2 の書き込み。
 * 合成は `AI_REQUEST_TIMEOUT_MS` で頭打ちなので、 その 2 回ぶんの余裕を取る
 * (再試行や R2 の遅れを吸収する厚み)。
 */
const QUESTION_LOCK_TTL_MS = 2 * AI_REQUEST_TIMEOUT_MS + 30_000;

/** 1 リクエストで生成できる質問数の上限 (TTS 呼び出しの直列実行時間を抑える)。 */
const TTS_BATCH_LIMIT = 10;

/** 練習録音の受け付け上限。 webm/opus なら 10 分超に相当し、 base64 化しても Workers の制限内。 */
const MAX_RECORDING_BYTES = 8 * 1024 * 1024;

function ttsKey(tenantId: string, no: number): string {
  return `${TTS_PREFIX}/${tenantId}/${interviewAudioObjectName(no)}`;
}

/**
 * テナント別キーになる前の共通キー。 **読み出しのフォールバックにのみ** 使う。
 *
 * 既存の登録済み音声 (175 問ぶん) をここで捨てると、 デプロイ直後に全部が
 * 「未登録」になり作り直しの TTS 費用がまるごと掛かる。 まだ誰も編集していない
 * 質問は questions.json の文面そのままなので、 旧キーの音声はそのまま正しい。
 * 編集済みの質問だけ旧キーを見ないようにして (文面が変わっている可能性がある)、
 * 書き込み・削除は常にテナント別キーに対してのみ行う (共有物を壊さない)。
 */
function legacyTtsKey(no: number): string {
  return `${TTS_PREFIX}/${interviewAudioObjectName(no)}`;
}

/**
 * R2 キー → テナント (旧キーは null) + 質問番号。
 * 深掘り時代の `<no>-deep1.mp3` は `parseInterviewAudioObjectName` が弾くので null。
 */
function parseTtsObjectKey(key: string): { tenantId: string | null; no: number } | null {
  const rest = key.slice(TTS_PREFIX.length + 1);
  const slash = rest.lastIndexOf("/");
  const no = parseInterviewAudioObjectName(slash < 0 ? rest : rest.slice(slash + 1));
  if (no === null) return null;
  return { tenantId: slash < 0 ? null : rest.slice(0, slash), no };
}

/**
 * ルートの `:no` を質問番号として読む。 `Number.parseInt` は "101junk" を 101 として
 * 受けてしまうので、 全体が数字であることを確かめる。
 */
function parseQuestionNoParam(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) throw new ApiError("質問番号が不正です", 400);
  const no = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(no) || no <= 0) throw new ApiError("質問番号が不正です", 400);
  return no;
}

/**
 * 指定プレフィックスの音声オブジェクトを列挙する。 `delimiter` を渡すとその階層の
 * 直下だけを返す (テナント配下へ降りずに旧共通キーだけを拾うのに使う)。
 */
async function listAudioObjects(
  bucket: R2Bucket,
  prefix: string,
  delimiter?: string,
): Promise<Array<{ key: string; hash: string | undefined }>> {
  const out: Array<{ key: string; hash: string | undefined }> = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({
      prefix,
      cursor,
      ...(delimiter ? { delimiter } : {}),
      include: ["customMetadata"],
    });
    for (const obj of page.objects) {
      out.push({ key: obj.key, hash: obj.customMetadata?.[INTERVIEW_AUDIO_TEXT_HASH_KEY] });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export interface AudioInventory {
  /** 音声が登録済みの質問番号。 */
  audioNos: number[];
  /** 登録時の本文と今の質問文が食い違う質問番号 (= 作り直しが要るもの)。 */
  audioStaleNos: number[];
}

const EMPTY_AUDIO_INVENTORY: AudioInventory = { audioNos: [], audioStaleNos: [] };

/**
 * R2 上に音声が登録済みの質問を列挙する (質問一覧・管理画面の表示用)。
 * 音声は任意の付加機能なので、 R2 の一時障害で質問一覧そのものを落とさない
 * (失敗時は空 = 再生ボタンを出さないだけ)。
 *
 * 併せて **古い音声** も割り出す。 生成時に読み上げテキストの指紋を
 * customMetadata へ載せてあるので、 今の質問文の指紋と突き合わせれば
 * 「質問文が変わったのに音声が付いてこられていない」質問が分かる。
 * 指紋を持たない音声 (想定質問を短い口語へ書き換えるより前の生成) も古い扱いにする。
 */
async function listQuestionAudio(
  bucket: R2Bucket | undefined,
  tenantId: string,
  questions: readonly { no: number; question: string }[] = [],
  /** このテナントが手で直した質問番号。 旧共通キーの音声を信用しない印。 */
  editedNos: ReadonlySet<number> = new Set(),
): Promise<AudioInventory> {
  if (!bucket) return EMPTY_AUDIO_INVENTORY;
  /** 質問番号 → 今の読み上げテキスト。 */
  const textByNo = new Map(questions.map((q) => [q.no, q.question]));
  try {
    /** 質問番号 → 音声の指紋。 */
    const toMap = (objects: Array<{ key: string; hash: string | undefined }>) => {
      const map = new Map<number, string | undefined>();
      for (const obj of objects) {
        const parsed = parseTtsObjectKey(obj.key);
        if (!parsed) continue;
        map.set(parsed.no, obj.hash);
      }
      return map;
    };
    // 自テナントぶんはプレフィックスで直接引く。 `interview-tts/` を丸ごと走査すると、
    // テナントが増えるほど 1 回の質問一覧が重くなる (受講者の毎リクエストで走る)。
    const own = toMap(await listAudioObjects(bucket, `${TTS_PREFIX}/${tenantId}/`));
    // 旧共通キーは `interview-tts/` の直下だけ。 delimiter で他テナントの配下へ降りない。
    const legacy = toMap(await listAudioObjects(bucket, `${TTS_PREFIX}/`, "/"));

    // 旧共通キーの音声は指紋を持たないので必ず「古い」判定になる (想定質問を短い
    // 口語へ書き換えた時点で、 どれも書き換え前の読み上げだと分かっている)。 受講者へ
    // は渡らないが、 テナント別がまだ無い質問では「R2 に旧い読み上げが在る」ことを
    // staff に見せる —— 試聴してから作り直せるようにするため。
    const effective = new Map(own);
    for (const [no, hash] of legacy) {
      // 編集済みの質問は旧共通キーを見ない。 その音声は編集前の文面かもしれず、
      // 共有物なので消すこともできない (他テナントがまだ持っている)。
      if (editedNos.has(no) || effective.has(no)) continue;
      effective.set(no, hash);
    }

    const nos: number[] = [];
    const stale: number[] = [];
    for (const [no, hash] of effective) {
      nos.push(no);
      const text = textByNo.get(no);
      if (text !== undefined && isInterviewAudioStale(hash, text)) stale.push(no);
    }
    const asc = (a: number, b: number) => a - b;
    return { audioNos: nos.sort(asc), audioStaleNos: stale.sort(asc) };
  } catch (e) {
    console.error("[interview-prep] failed to list question audio; serving without it", e);
    return EMPTY_AUDIO_INVENTORY;
  }
}

/**
 * 1 問を読み上げて R2 へ登録する。 読み上げたテキストの指紋を
 * customMetadata に残すのが要点で、 これが無いと後から
 * 「この音声はどの文面で作ったのか」が分からず古さを判定できない。
 */
async function putQuestionAudio(
  env: Env,
  bucket: R2Bucket,
  tenantId: string,
  no: number,
  text: string,
  includeUpstreamBody = false,
  modelId?: string,
): Promise<void> {
  const bytes = await synthesizeSpeech(
    env,
    text,
    env.INTERVIEW_TTS_LANG ?? "ja",
    includeUpstreamBody,
    modelId,
  );
  await bucket.put(ttsKey(tenantId, no), bytes, {
    httpMetadata: { contentType: "audio/mpeg" },
    customMetadata: { [INTERVIEW_AUDIO_TEXT_HASH_KEY]: interviewAudioTextHash(text) },
  });
}

/**
 * 受講者へ渡す再生可能インベントリ。 **本文と食い違う音声は渡さない**。
 *
 * 登録済みかどうかだけで再生を許すと、 編集したのに作り直せなかった音声が
 * そのまま流れ、 画面の質問文と読み上げが食い違ったまま練習させてしまう
 * (この機能が防ごうとしているもの)。 古い音声は staff にだけ見せて、
 * 試聴 → 再生成の導線に載せる。
 */
function learnerAudioInventory(inv: AudioInventory): AudioInventory {
  if (inv.audioStaleNos.length === 0) return inv;
  const stale = new Set(inv.audioStaleNos);
  return {
    audioNos: inv.audioNos.filter((no) => !stale.has(no)),
    audioStaleNos: inv.audioStaleNos,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseInterviewDate(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw new ApiError("interviewDate は YYYY-MM-DD 形式で指定してください", 400);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new ApiError("interviewDate は有効な日付で指定してください", 400);
  }
  return value;
}

function parseInterviewNote(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ApiError("note は文字列で指定してください", 400);
  }
  return value;
}

function requireCanEditAnswerTemplate(
  caller: Awaited<ReturnType<typeof getCaller>>["caller"],
  profileId: string,
): void {
  if (caller.role === "student" && caller.id !== profileId) {
    throw new ApiError("権限がありません", 403);
  }
  if (caller.role !== "student" && !canManageInterviewPrep(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/**
 * 面談対策の対象者 (受講者 / 管理者) が同じテナントに居ることを保証する。
 * 管理者も受講者と同じ練習をするので、 回答の型・割当の対象に含める。
 */
async function assertPrepTargetInTenant(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  profileId: string,
): Promise<void> {
  const target = await db
    .select({ id: profiles.id, tenantId: profiles.tenantId, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  if (!target[0] || target[0].tenantId !== tenantId) {
    throw new ApiError("対象の受講者が見つかりません", 404);
  }
  if (!canPracticeInterviewPrep(target[0].role)) {
    throw new ApiError("面談対策の回答の型は受講者と管理者のみ対象です", 400);
  }
}

function mapStaffQuestionRows(rows: InterviewQuestion[]) {
  return rows.map((row) => ({
    ...row,
    answer_template:
      row.answer_template != null ? plainCommonAnswerTemplate(row.answer_template) : null,
  }));
}

/**
 * このテナントで手編集された質問番号。 旧共通キーの音声を使ってよいかの判定に使う
 * (編集済み = questions.json と文面が違いうる = 共通の読み上げは当てにならない)。
 */
async function loadEditedQuestionNos(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
): Promise<Set<number>> {
  const rows = await db
    .select({ no: interviewQuestions.no, editedAt: interviewQuestions.editedAt })
    .from(interviewQuestions)
    .where(eq(interviewQuestions.tenantId, tenantId));
  return new Set(rows.filter((r) => r.editedAt != null).map((r) => r.no));
}

/**
 * 編集画面向けの付加情報 (Issue #237)。 「誰がいつ直したか」と、 その行が
 * 正本 (questions.json) の管理下から外れているかを出すために、 staff 一覧にだけ
 * 混ぜる。 受講者のペイロードには載せない (練習に要らない運用情報)。
 */
async function attachEditMarks<T extends { no: number }>(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  rows: T[],
): Promise<
  Array<
    T & { edited_at: string | null; edited_by: string | null; release_requested_at: string | null }
  >
> {
  const marks = await db
    .select({
      no: interviewQuestions.no,
      editedAt: interviewQuestions.editedAt,
      editedBy: interviewQuestions.editedBy,
      releaseRequestedAt: interviewQuestions.releaseRequestedAt,
    })
    .from(interviewQuestions)
    .where(eq(interviewQuestions.tenantId, tenantId));
  const iso = (v: Date | number | null | undefined): string | null =>
    v == null ? null : (v instanceof Date ? v : new Date(v)).toISOString();
  const byNo = new Map(marks.map((m) => [m.no, m]));
  return rows.map((row) => {
    const mark = byNo.get(row.no);
    return {
      ...row,
      edited_at: iso(mark?.editedAt),
      edited_by: mark?.editedBy ?? null,
      release_requested_at: iso(mark?.releaseRequestedAt),
    };
  });
}

/** API が返す改善点メモ 1 行 (日時は ISO 文字列)。 */
interface SerializedFixNote {
  id: string;
  question_no: number;
  text: string;
  created_at: string;
  resolved_at: string | null;
}

function serializeFixNote(row: {
  id: string;
  questionNo: number;
  text: string;
  createdAt: Date | string;
  resolvedAt: Date | string | null;
}): SerializedFixNote {
  const iso = (v: Date | string | null): string | null =>
    v == null ? null : v instanceof Date ? v.toISOString() : new Date(v).toISOString();
  return {
    id: row.id,
    question_no: row.questionNo,
    text: row.text,
    created_at: iso(row.createdAt) ?? new Date(0).toISOString(),
    resolved_at: iso(row.resolvedAt),
  };
}

/** 質問ごとの学習ステータス (interview_progress) を行に同梱する。 行なし = 未着手。 */
function attachProgressRows<T extends { no: number }>(
  rows: T[],
  byNo: Map<number, InterviewProgressState>,
): Array<
  T & {
    progress_status: "read" | "confident" | null;
    practiced_count: number;
    /** SM-2 の次回出題日 (`YYYY-MM-DD`)。 未練習は null (Issue #235)。 */
    srs_due_date: string | null;
    /** 最後の自己評価 (`again` は次のセットで最優先に再登場する)。 */
    last_result: "again" | "good" | null;
  }
> {
  return rows.map((row) => {
    const p = byNo.get(row.no);
    return {
      ...row,
      progress_status: p?.status ?? null,
      practiced_count: p?.practicedCount ?? 0,
      srs_due_date: p?.srsDueDate ?? null,
      last_result: p?.lastResult ?? null,
    };
  });
}

async function attachProgress<T extends { no: number }>(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  profileId: string,
  rows: T[],
) {
  return attachProgressRows(rows, await loadInterviewProgress(db, tenantId, profileId));
}

/** 進行中セットの要約 (準備ホームの「途中のセットを再開」)。 */
function summarizeActiveSet(set: PracticeSetRow | null) {
  if (!set) return null;
  const progress = practiceSetProgress(set.questionNos, set.completedNos);
  return {
    id: set.id,
    date: set.date,
    total: progress.total,
    completed: progress.completed,
    remaining: progress.remaining,
  };
}

/**
 * 準備率 (%) — 割当範囲の A 必修のうち `練習OK` の割合。 表示側 (`prepRate`) と
 * 同じ導出をサーバでも行い、 セット終了サマリの「伸び」に使う。
 */
function prepPercentOf(
  visible: InterviewQuestion[],
  personalByQuestion: Map<number, { content: string | null }>,
  progressByNo: Map<number, InterviewProgressState>,
): number {
  return prepRate(
    visible.map((q) => ({
      freq: q.freq,
      is_reverse: q.is_reverse,
      status: deriveQuestionPrepStatus({
        // 個別の型は A 必修にしか生成しない (enrichQuestionRows と揃える)。
        hasPersonalTemplate: q.freq === "A" && Boolean(personalByQuestion.get(q.no)?.content),
        progressStatus: progressByNo.get(q.no)?.status ?? null,
      }),
    })),
  ).percent;
}

/** 受講者本人の可視質問 + 個別の型 + 進捗。 準備率とセット選定で共用する。 */
async function loadLearnerPrepContext(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  profileId: string,
) {
  const rows: InterviewQuestion[] = await db
    .select(Q_SELECT)
    .from(interviewQuestions)
    .where(eq(interviewQuestions.tenantId, tenantId))
    .orderBy(asc(interviewQuestions.no));
  const assigned = await db
    .select({ categories: interviewPrepAssignments.categories })
    .from(interviewPrepAssignments)
    .where(
      and(
        eq(interviewPrepAssignments.tenantId, tenantId),
        eq(interviewPrepAssignments.profileId, profileId),
      ),
    )
    .limit(1);
  const visible = visibleQuestions(rows, assigned[0]?.categories ?? []);
  const personalByQuestion = await loadPersonalTemplatesByQuestion(db, tenantId, profileId);
  const progressByNo = await loadInterviewProgress(db, tenantId, profileId);
  return { visible, personalByQuestion, progressByNo };
}

/**
 * 改善点メモ (Issue #234) を質問行に同梱する。 未解決分は音声セッションで答える直前に、
 * 全件は準備タブの質問ドロワーの履歴に使う。
 */
async function attachFixNotes<T extends { no: number }>(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  profileId: string,
  rows: T[],
): Promise<Array<T & { fix_notes: SerializedFixNote[] }>> {
  const noteRows = await db
    .select({
      id: interviewFixNotes.id,
      questionNo: interviewFixNotes.questionNo,
      text: interviewFixNotes.text,
      createdAt: interviewFixNotes.createdAt,
      resolvedAt: interviewFixNotes.resolvedAt,
    })
    .from(interviewFixNotes)
    .where(
      and(eq(interviewFixNotes.tenantId, tenantId), eq(interviewFixNotes.profileId, profileId)),
    );
  const byNo = new Map<number, SerializedFixNote[]>();
  for (const row of noteRows) {
    const list = byNo.get(row.questionNo);
    const note = serializeFixNote(row);
    if (list) list.push(note);
    else byNo.set(row.questionNo, [note]);
  }
  return rows.map((row) => ({ ...row, fix_notes: byNo.get(row.no) ?? [] }));
}

/** 質問一覧。 受講者は割当カテゴリ + 共通のみ、 staff は全件。 staff は ?profileId= で受講者の個別回答の型も取得可。 */
interviewPrepRoute.get("/api/interview-prep/questions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows: InterviewQuestion[] = await db
      .select(Q_SELECT)
      .from(interviewQuestions)
      .where(eq(interviewQuestions.tenantId, caller.tenantId))
      .orderBy(asc(interviewQuestions.no));

    const profileIdParam = c.req.query("profileId")?.trim() || null;
    // 読み上げ音声が登録済みの質問。 UI はこれに含まれるものだけ再生する。
    // 本文が変わったのに音声が追いついていないものは audioStaleNos に出る。
    // 編集済みの質問は旧共通キーの音声を信用しない (編集前の文面かもしれない)。
    const editedNos = await loadEditedQuestionNos(db, caller.tenantId);
    const { audioNos, audioStaleNos } = await listQuestionAudio(
      c.env.MATERIALS_BUCKET,
      caller.tenantId,
      rows,
      editedNos,
    );

    if (canManageInterviewPrep(caller.role)) {
      if (profileIdParam) {
        await assertPrepTargetInTenant(db, caller.tenantId, profileIdParam);
        const assigned = await db
          .select({
            categories: interviewPrepAssignments.categories,
            interviewDate: interviewPrepAssignments.interviewDate,
            note: interviewPrepAssignments.interviewNote,
          })
          .from(interviewPrepAssignments)
          .where(
            and(
              eq(interviewPrepAssignments.tenantId, caller.tenantId),
              eq(interviewPrepAssignments.profileId, profileIdParam),
            ),
          )
          .limit(1);
        const categories = assigned[0]?.categories ?? [];
        const visible = visibleQuestions(rows, categories);
        const personalByQuestion = await loadPersonalTemplatesByQuestion(
          db,
          caller.tenantId,
          profileIdParam,
        );
        /**
         * 自分の練習ぶんを取りに来た staff (= 面談対策の対象になる管理者) には、
         * 受講者と同じく本文と食い違う音声を渡さない — 練習で古い読み上げを
         * 聞かせないため。 他人の行を覗くとき (モニタリングの詳細) は staff の
         * 試聴用にそのまま残す (聞いてから作り直せるように)。
         */
        const inventory =
          profileIdParam === caller.id && canPracticeInterviewPrep(caller.role)
            ? learnerAudioInventory({ audioNos, audioStaleNos })
            : { audioNos, audioStaleNos };
        return c.json({
          rows: await attachFixNotes(
            db,
            caller.tenantId,
            profileIdParam,
            await attachProgress(
              db,
              caller.tenantId,
              profileIdParam,
              enrichQuestionRows(visible, personalByQuestion),
            ),
          ),
          assignedCategories: categories,
          interviewDate: assigned[0]?.interviewDate ?? null,
          note: assigned[0]?.note ?? null,
          profileId: profileIdParam,
          audioNos: inventory.audioNos,
          audioStaleNos: inventory.audioStaleNos,
          activeSet: summarizeActiveSet(
            await loadActivePracticeSet(db, caller.tenantId, profileIdParam),
          ),
        });
      }
      return c.json({
        rows: await attachEditMarks(db, caller.tenantId, mapStaffQuestionRows(rows)),
        assignedCategories: [...ASSIGNABLE_CATEGORIES],
        audioNos,
        audioStaleNos,
      });
    }

    if (profileIdParam && profileIdParam !== caller.id) {
      throw new ApiError("権限がありません", 403);
    }
    // 受講者には本文と食い違う音声を渡さない (古い読み上げで練習させない)。
    const learnerAudio = learnerAudioInventory({ audioNos, audioStaleNos });
    const assigned = await db
      .select({
        categories: interviewPrepAssignments.categories,
        interviewDate: interviewPrepAssignments.interviewDate,
        note: interviewPrepAssignments.interviewNote,
      })
      .from(interviewPrepAssignments)
      .where(
        and(
          eq(interviewPrepAssignments.tenantId, caller.tenantId),
          eq(interviewPrepAssignments.profileId, caller.id),
        ),
      )
      .limit(1);
    const categories = assigned[0]?.categories ?? [];
    const visible = visibleQuestions(rows, categories);
    const personalByQuestion = await loadPersonalTemplatesByQuestion(
      db,
      caller.tenantId,
      caller.id,
    );
    return c.json({
      rows: await attachFixNotes(
        db,
        caller.tenantId,
        caller.id,
        await attachProgress(
          db,
          caller.tenantId,
          caller.id,
          enrichQuestionRows(visible, personalByQuestion),
        ),
      ),
      assignedCategories: categories,
      interviewDate: assigned[0]?.interviewDate ?? null,
      note: assigned[0]?.note ?? null,
      audioNos: learnerAudio.audioNos,
      audioStaleNos: learnerAudio.audioStaleNos,
      // 中断したセットがあれば準備ホームに「途中のセットを再開」を出す (Issue #235)。
      activeSet: summarizeActiveSet(await loadActivePracticeSet(db, caller.tenantId, caller.id)),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * staff: テナント内の面談対策の対象者一覧 + 割当カテゴリ (割当管理画面用)。
 *
 * 対象は受講者と管理者 (`INTERVIEW_PREP_PRACTICE_ROLES`)。 管理者も受講者と同じ
 * 練習をするため、 割当・モニタリングの行として並ぶ。 行がどちらかは `role` で分かる。
 */
interviewPrepRoute.get("/api/interview-prep/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageInterviewPrep(caller);
    const targets = await db
      .select({
        profile_id: profiles.id,
        display_name: profiles.displayName,
        email: profiles.email,
        role: profiles.role,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.tenantId, caller.tenantId),
          inArray(profiles.role, INTERVIEW_PREP_PRACTICE_ROLES),
          eq(profiles.disabled, false),
        ),
      )
      .orderBy(asc(profiles.displayName));
    const assignments = await db
      .select({
        profile_id: interviewPrepAssignments.profileId,
        categories: interviewPrepAssignments.categories,
        interviewDate: interviewPrepAssignments.interviewDate,
        note: interviewPrepAssignments.interviewNote,
      })
      .from(interviewPrepAssignments)
      .where(eq(interviewPrepAssignments.tenantId, caller.tenantId));
    const byProfile = new Map(
      assignments.map((a) => [
        a.profile_id,
        {
          categories: a.categories,
          interviewDate: a.interviewDate,
          note: a.note,
        },
      ]),
    );
    // モニタリング一覧 (Issue #236) の集計。 受講者ごとに引くと N+1 になるので、
    // 進捗・個別の型・質問をテナント単位でまとめて読んでから JS 側で割り当てる。
    const summaries = await loadInterviewPrepSummaries(
      db,
      caller.tenantId,
      new Map(targets.map((s) => [s.profile_id, byProfile.get(s.profile_id)?.categories ?? []])),
    );
    // 「面談が近い順」: これから → 済んだ面談 → 未設定 (並び順の正本は shared)。
    const rows = sortByInterviewDate(
      targets.map((s) => {
        const assignment = byProfile.get(s.profile_id);
        return {
          ...s,
          categories: assignment?.categories ?? [],
          interviewDate: assignment?.interviewDate ?? null,
          note: assignment?.note ?? null,
          ...(summaries.get(s.profile_id) ?? EMPTY_INTERVIEW_PREP_SUMMARY),
        };
      }),
      toStudyDate(Date.now()),
    );
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 受講者の割当カテゴリを upsert する。 Issue #205: interviewDate / note の write は sales/admin/platform_admin のみ。 */
interviewPrepRoute.put("/api/interview-prep/assignments/:profileId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageInterviewPrep(caller);
    const profileId = c.req.param("profileId");
    const body = (await c.req.json()) as {
      categories?: unknown;
      interviewDate?: unknown;
      note?: unknown;
    };

    const writesSchedule = body.interviewDate !== undefined || body.note !== undefined;
    if (writesSchedule && !canWriteInterviewSchedule(caller.role)) {
      throw new ApiError("権限がありません", 403);
    }

    if (!Array.isArray(body.categories) || !body.categories.every(isAssignableCategory)) {
      throw new ApiError(
        `categories は ${ASSIGNABLE_CATEGORIES.join(" / ")} の配列で指定してください`,
        400,
      );
    }
    const categories: string[] = body.categories;

    const interviewDate =
      body.interviewDate !== undefined ? parseInterviewDate(body.interviewDate) : undefined;
    const interviewNote = body.note !== undefined ? parseInterviewNote(body.note) : undefined;

    const target = await db
      .select({ id: profiles.id, tenantId: profiles.tenantId, role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (!target[0] || target[0].tenantId !== caller.tenantId) {
      throw new ApiError("対象の受講者が見つかりません", 404);
    }
    if (!canPracticeInterviewPrep(target[0].role)) {
      throw new ApiError("面談対策の割当は受講者と管理者のみ対象です", 400);
    }

    const existing = await db
      .select({
        interviewDate: interviewPrepAssignments.interviewDate,
        interviewNote: interviewPrepAssignments.interviewNote,
      })
      .from(interviewPrepAssignments)
      .where(
        and(
          eq(interviewPrepAssignments.tenantId, caller.tenantId),
          eq(interviewPrepAssignments.profileId, profileId),
        ),
      )
      .limit(1);

    const previousInterviewDate = existing[0]?.interviewDate ?? null;
    const nextInterviewDate = interviewDate !== undefined ? interviewDate : previousInterviewDate;
    const nextInterviewNote =
      interviewNote !== undefined ? interviewNote : (existing[0]?.interviewNote ?? null);

    await db
      .insert(interviewPrepAssignments)
      .values({
        tenantId: caller.tenantId,
        profileId,
        categories,
        interviewDate: nextInterviewDate,
        interviewNote: nextInterviewNote,
        assignedBy: caller.id,
      })
      .onConflictDoUpdate({
        target: [interviewPrepAssignments.tenantId, interviewPrepAssignments.profileId],
        set: {
          categories,
          interviewDate: nextInterviewDate,
          interviewNote: nextInterviewNote,
          assignedBy: caller.id,
          updatedAt: new Date(),
        },
      });

    const interviewDateNewlySet =
      interviewDate !== undefined &&
      interviewDate !== null &&
      interviewDate !== previousInterviewDate;
    if (interviewDateNewlySet) {
      await db.insert(notifications).values({
        userId: profileId,
        tenantId: caller.tenantId,
        type: "interview_date_set",
        title: "面談予定日が登録されました",
        body: `面談予定日: ${interviewDate}${nextInterviewNote ? ` — ${nextInterviewNote}` : ""}`,
        payload: {
          interview_date: interviewDate,
          note: nextInterviewNote,
        },
      });
    }

    const metadata: Record<string, unknown> = { categories };
    if (interviewDate !== undefined) metadata.interviewDate = interviewDate;

    await recordAudit(db, caller, {
      action: "interview_prep_assign",
      targetType: "interview_prep_assignment",
      targetId: profileId,
      ip: clientIp(c),
      metadata,
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 個別「回答の型」を編集 (Issue #206)。 全ロール可 — updated_by を記録。 */
interviewPrepRoute.put("/api/interview-prep/answer-templates/:profileId/:no", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const profileId = c.req.param("profileId");
    const questionNo = Number.parseInt(c.req.param("no"), 10);
    if (!Number.isFinite(questionNo)) {
      throw new ApiError("質問番号が不正です", 400);
    }

    requireCanEditAnswerTemplate(caller, profileId);

    const body = (await c.req.json()) as { content?: unknown };
    if (typeof body.content !== "string" || body.content.trim() === "") {
      throw new ApiError("content が必要です", 400);
    }

    await assertPrepTargetInTenant(db, caller.tenantId, profileId);

    await upsertPersonalAnswerTemplate({
      db,
      tenantId: caller.tenantId,
      profileId,
      questionNo,
      content: body.content,
      updatedBy: caller.id,
    });

    await recordAudit(db, caller, {
      action: "answer_template_edited",
      targetType: "interview_personal_template",
      targetId: `${profileId}:${questionNo}`,
      ip: clientIp(c),
      metadata: { questionNo },
    });

    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 生成ドラフトを採用 (Issue #206)。 */
interviewPrepRoute.post(
  "/api/interview-prep/answer-templates/:profileId/:no/adopt-draft",
  async (c) => {
    try {
      const { caller, db } = await getCaller(c);
      const profileId = c.req.param("profileId");
      const questionNo = Number.parseInt(c.req.param("no"), 10);
      if (!Number.isFinite(questionNo)) {
        throw new ApiError("質問番号が不正です", 400);
      }

      requireCanEditAnswerTemplate(caller, profileId);

      try {
        await assertPrepTargetInTenant(db, caller.tenantId, profileId);
        await adoptPersonalTemplateDraft({
          db,
          tenantId: caller.tenantId,
          profileId,
          questionNo,
          updatedBy: caller.id,
        });
      } catch {
        throw new ApiError("採用可能なドラフトがありません", 404);
      }

      await recordAudit(db, caller, {
        action: "answer_template_edited",
        targetType: "interview_personal_template",
        targetId: `${profileId}:${questionNo}`,
        ip: clientIp(c),
        metadata: { questionNo, adoptedDraft: true },
      });

      return c.json({ ok: true });
    } catch (err) {
      return errorResponse(c, err);
    }
  },
);

/**
 * 生成対象の質問番号の解釈。 重複は畳んで、 合計が TTS_BATCH_LIMIT を超えたら 400
 * (直列生成の実行時間を抑える)。
 */
function parseAudioGenerateTargets(body: { nos?: unknown }): number[] {
  if (
    !Array.isArray(body.nos) ||
    body.nos.length === 0 ||
    !body.nos.every((n): n is number => Number.isInteger(n) && (n as number) > 0)
  ) {
    throw new ApiError("nos は質問番号 (正の整数) の配列で指定してください", 400);
  }
  const targets = [...new Set(body.nos)];
  if (targets.length > TTS_BATCH_LIMIT) {
    throw new ApiError(`一度に生成できるのは ${TTS_BATCH_LIMIT} 件までです`, 400);
  }
  return targets;
}

function parseAudioGenerateModel(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  if (!isInterviewTtsModelId(raw)) {
    throw new ApiError("model は grok-tts / openai/tts-1 / openai/tts-1-hd のいずれかです", 400);
  }
  return raw;
}

// ---------------------------------------------------------------------------
// 音声 (Workers AI): 質問読み上げは admin が事前生成して R2 登録、 受講者向け GET は
// 配信のみで AI を呼ばない。 回答の文字起こしは Whisper large-v3-turbo。
// ---------------------------------------------------------------------------

/**
 * 質問 1 件を取り出しつつ read 権限を検査する。
 * 受講者は割当カテゴリ + 共通の範囲外なら 403 (一覧 API と同じ可視性)。
 *
 * `scope: "self-practice"` を渡すと、 質問全件を読める staff であっても本人の割当で
 * 判定する。 練習の記録 (学習ステータス・改善点メモ) は「自分に割り当てられた質問を
 * 練習する」ものなので、 管理者が対象に加わっても受講者と同じ範囲に閉じる。
 */
async function loadVisibleQuestion(
  c: Parameters<typeof getCaller>[0],
  no: number,
  opts: { scope?: "read" | "self-practice" } = {},
): Promise<{
  caller: Awaited<ReturnType<typeof getCaller>>["caller"];
  question: InterviewQuestion;
  /** 手編集済みか。 旧共通キーの音声を使ってよいかの判定に使う。 */
  edited: boolean;
}> {
  const { caller, db } = await getCaller(c);
  const rows = await db
    .select({ ...Q_SELECT, editedAt: interviewQuestions.editedAt })
    .from(interviewQuestions)
    .where(and(eq(interviewQuestions.tenantId, caller.tenantId), eq(interviewQuestions.no, no)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new ApiError("質問が見つかりません", 404);
  const { editedAt, ...question } = row as InterviewQuestion & { editedAt: Date | null };
  if (opts.scope === "self-practice" || !canManageInterviewPrep(caller.role)) {
    const assigned = await db
      .select({ categories: interviewPrepAssignments.categories })
      .from(interviewPrepAssignments)
      .where(
        and(
          eq(interviewPrepAssignments.tenantId, caller.tenantId),
          eq(interviewPrepAssignments.profileId, caller.id),
        ),
      )
      .limit(1);
    if (visibleQuestions([question], assigned[0]?.categories ?? []).length === 0) {
      throw new ApiError("この質問は割当範囲外です", 403);
    }
  }
  return { caller, question, edited: editedAt != null };
}

/**
 * 配信する音声を選ぶ。 テナント別の音声が正だが、 それが今の本文と食い違っていて、
 * かつ質問が未編集なら、 正本の読み上げ (テナント別キーになる前の共通キー) の方が
 * 合っている —— 「編集 → 作り直し → 正本へ戻す → seed で本文が戻る」の後がこれ。
 *
 * どちらも本文と合わないときは、 staff の試聴用にあるものを `fresh: false` で返す。
 */
async function pickQuestionAudio(
  bucket: R2Bucket,
  tenantId: string,
  no: number,
  text: string | undefined,
  edited: boolean,
): Promise<{ object: R2ObjectBody | null; fresh: boolean }> {
  const isFresh = (o: R2ObjectBody | null): boolean =>
    o !== null &&
    text !== undefined &&
    !isInterviewAudioStale(o.customMetadata?.[INTERVIEW_AUDIO_TEXT_HASH_KEY], text);

  const own = await bucket.get(ttsKey(tenantId, no));
  if (isFresh(own)) return { object: own, fresh: true };
  // 編集済みの質問では共通キーを見ない (編集前の文面の読み上げかもしれない)。
  const shared = edited ? null : await bucket.get(legacyTtsKey(no));
  if (isFresh(shared)) return { object: shared, fresh: true };
  return { object: own ?? shared, fresh: false };
}

/**
 * 読み上げ音声 (MP3) の配信。 admin が事前生成して R2 に登録した音声を返すだけで、
 * ここでは AI を呼ばない。 未登録は 404 (UI は再生ボタンを出さない)。
 */
interviewPrepRoute.get("/api/interview-prep/questions/:no/audio", async (c) => {
  try {
    const no = parseQuestionNoParam(c.req.param("no"));
    const { caller, question, edited } = await loadVisibleQuestion(c, no);

    const bucket = c.env.MATERIALS_BUCKET;
    if (!bucket) throw new ApiError("音声機能は未設定です (R2 バインディングなし)", 503);
    const { object, fresh } = await pickQuestionAudio(
      bucket,
      caller.tenantId,
      no,
      question.question,
      edited,
    );
    if (!object) throw new ApiError("この質問の音声は未登録です", 404);
    // 一覧から外すだけでは、 この URL を直接叩けば古い読み上げが取れてしまう。
    // 受講者には本文と一致する音声だけ返す。 staff は再生成の前に試聴できる。
    if (!fresh && !canManageInterviewPrep(caller.role)) {
      throw new ApiError("この質問の音声は本文の更新待ちです", 404);
    }

    return new Response(object.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(object.size),
        ETag: object.httpEtag,
        // 再生成で同じキーの内容が変わるため、 ブラウザには都度再検証させる。
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * admin: 指定した質問の読み上げ音声を TTS モデル (既定 Grok TTS) で生成し R2 へ
 * 登録する。 既存キーは上書き (= 再生成)。 コスト管理のため生成はこのエンドポイントに
 * 閉じ、 1 回の呼び出しで最大 TTS_BATCH_LIMIT 問まで直列に処理する。
 *
 * body は `{ nos: number[] }`。 `model` は任意 (grok-tts / openai/tts-1 /
 * openai/tts-1-hd)。 未指定は env の既定。
 */
interviewPrepRoute.post("/api/interview-prep/audio/generate", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "admin", "platform_admin");

    const body = (await c.req.json()) as { nos?: unknown; model?: unknown };
    const requested = parseAudioGenerateTargets(body);
    const modelId = parseAudioGenerateModel(body.model);

    if (!workersAiConfigured(c.env)) {
      throw new ApiError("音声機能は未設定です (WORKERS_AI_API_TOKEN を設定してください)", 503);
    }
    const bucket = c.env.MATERIALS_BUCKET;
    if (!bucket) throw new ApiError("音声機能は未設定です (R2 バインディングなし)", 503);

    const limited = await enforceAiRateLimit(c);
    if (limited) return limited;

    /** 質問番号 → 読み上げテキスト (= 質問文)。 */
    const loadTexts = async (): Promise<Map<number, string>> => {
      const questions = await db
        .select({ no: interviewQuestions.no, question: interviewQuestions.question })
        .from(interviewQuestions)
        .where(eq(interviewQuestions.tenantId, caller.tenantId));
      return new Map(questions.map((q) => [q.no, q.question]));
    };
    const textByNo = await loadTexts();

    const results: Array<{ no: number; ok: boolean; error?: string }> = [];
    for (const no of requested) {
      const text = textByNo.get(no);
      if (!text) {
        results.push({ no, ok: false, error: "質問が見つかりません" });
        continue;
      }
      try {
        // 質問編集と同じロックを取る。 編集の途中に割り込んで書くと、 本文と音声が
        // 食い違ったまま残りうる。 取れなければこの質問だけ諦める。
        const locked = await withResourceLock(
          db,
          interviewQuestionLockId(caller.tenantId, no),
          () => putQuestionAudio(c.env, bucket, caller.tenantId, no, text, true, modelId),
          { ttlMs: QUESTION_LOCK_TTL_MS },
        );
        if (!locked.ran) {
          results.push({
            no,
            ok: false,
            error: "この質問は編集中です (しばらくしてから再生成してください)",
          });
          continue;
        }
        results.push({ no, ok: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error(`[interview-tts] generate failed no=${no}: ${error}`);
        results.push({ no, ok: false, error });
      }
    }

    // 生成の合間に営業が同じ質問を保存していると、 書いたのは前の文面の読み上げに
    // なる。 成功で返すと管理画面は「古い音声」の印を消してしまうので、 書いたあとに
    // 本文を読み直して、 追い越されたものは失敗として返す (PATCH 側と同じ扱い)。
    if (results.some((r) => r.ok)) {
      try {
        const current = await loadTexts();
        for (const r of results) {
          if (!r.ok) continue;
          if (current.get(r.no) !== textByNo.get(r.no)) {
            r.ok = false;
            r.error = "生成中に本文が変わりました (作り直してください)";
          }
        }
      } catch (e) {
        // 確認できないだけなら、 生成そのものは成功しているのでそのまま返す。
        console.error("[interview-prep] failed to verify generated audio", e);
      }
    }

    await recordAudit(db, caller, {
      action: "interview_tts_generate",
      targetType: "interview_question_audio",
      targetId: requested.join(","),
      ip: clientIp(c),
      metadata: {
        requested: requested.length,
        succeeded: results.filter((r) => r.ok).length,
        model: modelId ?? null,
      },
    });
    return c.json({ results });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------------------
// 質問文の編集 (admin / sales) — Issue #237
//
// 直した本文がそのまま読み上げに反映されないと、 画面の質問と音声が食い違ったまま
// 受講者の練習に出てしまう。 そこで保存の延長で、 質問文が変わったときだけ音声を
// 作り直す (質問意図や回答の型を直しても読み上げは変わらない)。 音声は付加機能なので、
// 生成が落ちても保存自体は成功にし、 音声が古いままかどうかを応答で返して画面に出す。
// ---------------------------------------------------------------------------

/** 編集の結果、 音声に何が起きたか。 1 質問 = 1 音声なので各項目は真偽値。 */
interface AudioSyncResult {
  /** 新しい質問文で作り直せた。 */
  regenerated: boolean;
  /** 質問文は変わったが音声が追いついていない (未設定・TTS 失敗)。 */
  stale: boolean;
  /** stale の理由 (画面に出す 1 行)。 stale でなければ null。 */
  reason: string | null;
}

const NO_AUDIO_CHANGE: AudioSyncResult = { regenerated: false, stale: false, reason: null };

/**
 * ロックを取れなかったときの報告。 **R2 は読むだけで一切変更しない** のが要点。
 *
 * 直列化できていない状態で消したり書いたりすると、 ロックを持っている別の
 * リクエストが今まさに書いた音声を壊しうる。 何が古くなったかだけ伝えて、
 * 作り直しは管理画面 (ロックを取り直せる) にまかせる。
 */
async function reportUnsyncedAudio(
  bucket: R2Bucket | undefined,
  tenantId: string,
  no: number,
  changed: boolean,
  reason: string,
): Promise<AudioSyncResult> {
  if (!changed) return NO_AUDIO_CHANGE;
  // R2 が無ければ何も確かめられないが、 本文が変わったのに音声は書けていない。
  // ロックを取れた側 (`syncQuestionAudio`) と同じく「作り直しが要る」と返す。
  if (!bucket) {
    return {
      regenerated: false,
      stale: true,
      reason: "音声の保存先 (R2) が未設定のため、 読み上げ音声は更新していません",
    };
  }
  // 登録済みのものだけ「古い」と言う (未登録は古いのではなく無いだけ)。 旧共通キーも
  // 見るのが要点 —— この保存で `edited_at` が入り、 その質問はもう旧共通キーの音声を
  // 使わなくなる。 テナント別だけを見て「追従は不要」と返すと、 受講者に渡せる音声が
  // 1 つも無くなったことを admin に伝えないまま終わる。
  const stale = await hasUnsyncedAudio(bucket, tenantId, no);
  return { regenerated: false, stale, reason: stale ? reason : null };
}

/**
 * 作り直せなかったときに「音声が古いまま残っているか」を見る。 **消さない**。
 *
 * かつてはここで指紋を持たない音声を消していた。 残すと次の一覧で「古いと分からない
 * = 現行」と判定され、 警告も再生成の導線もないまま古い読み上げが再生できてしまう、
 * というのが理由だったが、 `isInterviewAudioStale` が指紋の無い音声を古い側へ倒す
 * ようになったのでその穴は塞がっている。 消す理由が無くなった以上は残す —— staff が
 * 試聴してから作り直せるし、 共有物 (旧共通キー) を壊す経路も持たなくて済む。
 */
async function hasUnsyncedAudio(bucket: R2Bucket, tenantId: string, no: number): Promise<boolean> {
  try {
    // テナント別が無ければ、 これまで使っていたのは旧共通キーの音声。 どちらも
    // 今の本文とは合っていないので、 在るなら「古いまま」として報告する。
    return (
      (await bucket.head(ttsKey(tenantId, no))) !== null ||
      (await bucket.head(legacyTtsKey(no))) !== null
    );
  } catch (e) {
    // R2 が読めないだけなら、 古いかもしれないものとして報告しておく。
    console.error(`[interview-prep] failed to inspect audio ${no}`, e);
    return true;
  }
}

/**
 * 質問文が変わったときに読み上げ音声を作り直す。
 *
 * 失敗しても編集そのものは成功にし、 「古いまま」を返して画面から手で再生成できる
 * ようにする (音声は付加機能)。
 */
async function syncQuestionAudio(
  env: Env,
  tenantId: string,
  no: number,
  text: string,
  changed: boolean,
  /** 生成を止める理由 (レート制限など)。 null なら生成してよい。 */
  blockedReason: string | null = null,
  /**
   * 書き込み後に質問文を読み直す手段。 合成は数秒かかるので、 その間に別の staff が
   * 同じ質問を保存していると、 先に確定した本文の上へ後から終わった合成が乗る。
   * 書いたあとに現在の本文と突き合わせて、 追い越されていたら「作り直せた」とは
   * 報告しない (R2 の指紋も現在の本文と食い違うので、 一覧では古い音声として出る)。
   */
  reloadText?: () => Promise<string | null>,
): Promise<AudioSyncResult> {
  if (!changed) return NO_AUDIO_CHANGE;

  const bucket = env.MATERIALS_BUCKET;
  if (!bucket) {
    return {
      regenerated: false,
      stale: true,
      reason: "音声の保存先 (R2) が未設定のため、 読み上げ音声は更新していません",
    };
  }

  // 生成できない理由 (レート制限 / 未設定)。 どちらも「編集は残すが音声は追いつけない」
  // という同じ後始末になる。
  const blocked =
    blockedReason ??
    (workersAiConfigured(env)
      ? null
      : "読み上げが未設定のため、 音声は更新できていません (管理画面から生成できます)");
  if (blocked) {
    const stale = await hasUnsyncedAudio(bucket, tenantId, no);
    return { regenerated: false, stale, reason: stale ? blocked : null };
  }

  try {
    await putQuestionAudio(env, bucket, tenantId, no, text);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[interview-prep] failed to regenerate audio ${no}`, e);
    // 失敗した以上、 R2 に残っているのは前の本文の読み上げ。 古いと分かる形で
    // 残るので (指紋の有無によらず古い判定になる)、 消さずに報告だけする。
    return {
      regenerated: false,
      stale: await hasUnsyncedAudio(bucket, tenantId, no),
      reason: `読み上げ音声の更新に失敗しました (${error})`,
    };
  }

  // 合成中に別の保存が本文を進めていないか確かめる。 追い越されていたら
  // 「今の本文の読み上げ」ではないので、 古い音声として扱う。
  if (reloadText) {
    try {
      if ((await reloadText()) !== text) {
        return {
          regenerated: false,
          stale: true,
          reason: "保存中に別の編集が入ったため、 音声は作り直しが必要です",
        };
      }
    } catch (e) {
      // 確認できないだけなら、 生成そのものは成功しているのでそのまま報告する。
      console.error(`[interview-prep] failed to verify regenerated audio for ${no}`, e);
    }
  }

  return { regenerated: true, stale: false, reason: null };
}

/** パッチを適用したあとの質問 (音声の差分計算と応答に使う)。 */
function applyQuestionPatch(
  row: InterviewQuestion,
  patch: InterviewQuestionPatch,
): InterviewQuestion {
  return { ...row, ...patch };
}

/**
 * パッチを drizzle の `.set()` 引数へ。 API の項目名は questions.json 由来の
 * snake_case、 列は camelCase なので、 ここで 1 対 1 に詰め替える
 * (スプレッドで通すと未知キーが混ざる)。
 */
function questionUpdateSet(patch: InterviewQuestionPatch) {
  const set: Partial<typeof interviewQuestions.$inferInsert> = {};
  if (patch.question !== undefined) set.question = patch.question;
  if (patch.subcategory !== undefined) set.subcategory = patch.subcategory;
  if (patch.time !== undefined) set.time = patch.time;
  if (patch.keywords !== undefined) set.keywords = patch.keywords;
  if (patch.intent !== undefined) set.intent = patch.intent;
  if (patch.answer_template !== undefined) set.answerTemplate = patch.answer_template;
  if (patch.ng !== undefined) set.ng = patch.ng;
  if (patch.criteria !== undefined) set.criteria = patch.criteria;
  if (patch.categories !== undefined) set.categories = patch.categories;
  if (patch.freq !== undefined) set.freq = patch.freq;
  if (patch.is_reverse !== undefined) set.isReverse = patch.is_reverse;
  return set;
}

/**
 * admin / sales: 想定質問 1 件を編集する。
 *
 * 編集した行には `edited_at` が入り、 seed (questions.json が正本) の upsert が
 * 上書きしなくなる。 `DELETE .../edit-mark` でこの印を外すと、 次の seed で
 * 正本の文面へ戻る。
 */
interviewPrepRoute.patch("/api/interview-prep/questions/:no", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanEditInterviewQuestions(caller);

    const no = parseQuestionNoParam(c.req.param("no"));

    let patch: InterviewQuestionPatch;
    try {
      patch = normalizeInterviewQuestionPatch(await c.req.json());
    } catch (e) {
      if (e instanceof InterviewQuestionPatchError) throw new ApiError(e.message, 400);
      throw new ApiError("更新内容が不正です", 400);
    }

    const loadRow = async (): Promise<InterviewQuestion | undefined> => {
      const rows: InterviewQuestion[] = await db
        .select(Q_SELECT)
        .from(interviewQuestions)
        .where(and(eq(interviewQuestions.tenantId, caller.tenantId), eq(interviewQuestions.no, no)))
        .limit(1);
      return rows[0];
    };

    const editedAt = new Date();
    /** 本文を更新して、 差分ぶんの読み上げ音声を追従させる。 */
    const applyEdit = async (
      before: InterviewQuestion,
      lockHeld: boolean,
    ): Promise<{ after: InterviewQuestion; audio: AudioSyncResult }> => {
      const after = applyQuestionPatch(before, patch);
      const audioChanged = questionAudioChanged(before.question, after.question);

      await db
        .update(interviewQuestions)
        // 直したのだから、 前に出した「正本へ戻す」予約は取り消す。
        .set({
          ...questionUpdateSet(patch),
          editedAt,
          editedBy: caller.id,
          releaseRequestedAt: null,
        })
        .where(
          and(eq(interviewQuestions.tenantId, caller.tenantId), eq(interviewQuestions.no, no)),
        );

      // ロックを取れていないなら R2 には一切触らない。 消すのも書くのも、 ロックを
      // 持っている別のリクエストの音声を壊しうる —— `syncQuestionAudio` は削除から
      // 始まるので、 「理由」を渡して呼ぶだけでは触らせない扱いにならない。
      if (!lockHeld) {
        return {
          after,
          audio: await reportUnsyncedAudio(
            c.env.MATERIALS_BUCKET,
            caller.tenantId,
            no,
            audioChanged,
            "同じ質問への更新が進行中のため、 音声は更新できていません (管理画面から再生成してください)",
          ),
        };
      }

      // 読み上げは有料なので、 生成が実際に走るときだけレート制限を消費する
      // (質問意図だけ直した保存で枠を減らさない)。 上限に当たっても編集は保存し、
      // 音声は「古いまま」として返す — 編集そのものを 429 で落とさない。
      let blocked: string | null = null;
      if (audioChanged && workersAiConfigured(c.env)) {
        const limited = await enforceAiRateLimit(c);
        if (limited) {
          blocked =
            "リクエストが多すぎます。 音声は更新できていません (時間をおいて管理画面から再生成してください)";
        }
      }

      const audio = await syncQuestionAudio(
        c.env,
        caller.tenantId,
        no,
        after.question,
        audioChanged,
        blocked,
        async () => (await loadRow())?.question ?? null,
      );
      return { after, audio };
    };

    // 本文の更新と音声の更新を 1 つのロックの中で行う。 R2 にも D1 にも比較交換が
    // 無いので、 「読んでから書く」を重ねるだけでは隙間が閉じない —— 同じ質問への
    // 同時操作そのものを直列化して、 本文と音声が食い違う経路を無くす。
    const lockId = interviewQuestionLockId(caller.tenantId, no);
    const locked = await withResourceLock(
      db,
      lockId,
      async () => {
        const before = await loadRow();
        if (!before) throw new ApiError("質問が見つかりません", 404);
        return applyEdit(before, true);
      },
      { ttlMs: QUESTION_LOCK_TTL_MS },
    );

    // 待っても取れなければ編集だけ保存する。 音声は触らず「古いまま」と返す
    // (編集そのものをロックの都合で落とさない)。
    const { after, audio } = locked.ran
      ? locked.value
      : await (async () => {
          const before = await loadRow();
          if (!before) throw new ApiError("質問が見つかりません", 404);
          return applyEdit(before, false);
        })();

    await recordAudit(db, caller, {
      action: "interview_question_edit",
      targetType: "interview_question",
      targetId: String(no),
      ip: clientIp(c),
      metadata: {
        fields: Object.keys(patch),
        audioRegenerated: audio.regenerated,
        audioStale: audio.stale,
      },
    });

    return c.json({
      row: mapStaffQuestionRows([after])[0],
      edited_at: editedAt.toISOString(),
      edited_by: caller.id,
      audio,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * admin / sales: 手動編集の印 (`edited_at`) を外し、 質問を正本 (questions.json)
 * の管理下へ戻す。 本文はその場では変わらず、 次の seed で正本の文面に戻る。
 */
interviewPrepRoute.delete("/api/interview-prep/questions/:no/edit-mark", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanEditInterviewQuestions(caller);

    const no = parseQuestionNoParam(c.req.param("no"));

    const existing = await db
      .select({ no: interviewQuestions.no })
      .from(interviewQuestions)
      .where(and(eq(interviewQuestions.tenantId, caller.tenantId), eq(interviewQuestions.no, no)))
      .limit(1);
    if (!existing[0]) throw new ApiError("質問が見つかりません", 404);

    // ここで `edited_at` を落とすと、 本文はまだ編集後のままなのに「編集していない行」に
    // 見えてしまう。 音声側はこの印で「テナント別キーになる前の共通の読み上げを使って
    // よいか」を決めているので、 編集後の本文に編集前の読み上げが付く。 実際に本文が
    // 正本へ戻るのは次の seed なので、 解除は予約として持ち、 印はそのままにする。
    const releaseRequestedAt = new Date();
    await db
      .update(interviewQuestions)
      .set({ releaseRequestedAt })
      .where(and(eq(interviewQuestions.tenantId, caller.tenantId), eq(interviewQuestions.no, no)));

    await recordAudit(db, caller, {
      action: "interview_question_edit",
      targetType: "interview_question",
      targetId: String(no),
      ip: clientIp(c),
      metadata: { fields: ["edited_at"], releasedToSeed: true },
    });

    return c.json({ ok: true, release_requested_at: releaseRequestedAt.toISOString() });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 練習録音の文字起こし。 body は録音バイナリそのまま (webm/opus など)。
 * `?no=` を付けると該当質問の文脈を Whisper の initial_prompt に渡し、
 * 専門用語の認識精度を上げる (可視性検査も兼ねる)。
 */
interviewPrepRoute.post("/api/interview-prep/transcribe", async (c) => {
  try {
    const noParam = c.req.query("no");
    let question: InterviewQuestion | null = null;
    if (noParam !== undefined) {
      const no = Number.parseInt(noParam, 10);
      if (!Number.isInteger(no) || no <= 0) throw new ApiError("質問番号が不正です", 400);
      question = (await loadVisibleQuestion(c, no)).question;
    } else {
      await getCaller(c); // 認証だけ通す
    }

    if (!workersAiConfigured(c.env)) {
      throw new ApiError("音声機能は未設定です (WORKERS_AI_API_TOKEN を設定してください)", 503);
    }

    const body = new Uint8Array(await c.req.arrayBuffer());
    if (body.length === 0) throw new ApiError("録音データが空です", 400);
    if (body.length > MAX_RECORDING_BYTES) {
      throw new ApiError("録音が長すぎます。 数分以内に区切って録音してください", 400);
    }

    const limited = await enforceAiRateLimit(c);
    if (limited) return limited;

    const result = await transcribeAudio(c.env, body, {
      initialPrompt: question ? `面談の想定質問「${question.question}」への回答。` : undefined,
    });

    return c.json({
      transcript: result.text,
      durationSec: result.durationSec,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------------------
// 今日の練習セット (Issue #235): SM-2 で 10 問を選び、 中断・再開とセット終了サマリを持つ。
// ---------------------------------------------------------------------------

/** セット行を API の形 (snake_case) に落とす。 */
function serializePracticeSet(set: PracticeSetRow) {
  const progress = practiceSetProgress(set.questionNos, set.completedNos);
  return {
    id: set.id,
    date: set.date,
    question_nos: set.questionNos,
    completed_nos: set.completedNos,
    confident_nos: set.confidentNos,
    started_percent: set.startedPercent,
    status: set.status,
    total: progress.total,
    completed: progress.completed,
    remaining: progress.remaining,
    next_no: progress.nextNo,
    finished: progress.finished,
  };
}

/**
 * 受講者・管理者: 「今日の練習セット」を取得する。 進行中のセットがあればそれをそのまま返し
 * (= 中断からの再開)、 無ければ SM-2 で 10 問を選んで作る。
 *
 * 優先度は `selectPracticeSet` に閉じている: 「もう一度」→ 未着手・未練習 →
 * 期日を過ぎた `練習OK`、 それでも埋まらないときだけ期日前を前倒しで補充する。
 * 対象は割当カテゴリの A 必修のみ (逆質問は「聞く質問」なので出さない)。
 */
interviewPrepRoute.get("/api/interview-prep/practice-set", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanPracticeInterviewPrep(caller);

    const { visible, personalByQuestion, progressByNo } = await loadLearnerPrepContext(
      db,
      caller.tenantId,
      caller.id,
    );
    const candidates: PracticeCandidate[] = visible.map((q) => {
      const p = progressByNo.get(q.no);
      return {
        no: q.no,
        freq: q.freq,
        is_reverse: q.is_reverse,
        status: p?.status ?? null,
        practicedCount: p?.practicedCount ?? 0,
        srsDueDate: p?.srsDueDate ?? null,
        lastResult: p?.lastResult ?? null,
      };
    });

    const startedPercent = prepPercentOf(visible, personalByQuestion, progressByNo);
    const started = await startOrResumePracticeSet({
      db,
      tenantId: caller.tenantId,
      profileId: caller.id,
      candidates,
      startedPercent,
      at: new Date(),
      size: PRACTICE_SET_SIZE,
    });
    if (!started) {
      // 割当前・A 必修が 0 問。 UI は「全問からランダム」へ誘導する。
      return c.json({ set: null, resumed: false, rows: [], prepPercent: startedPercent });
    }

    // 出題順を保ったまま質問本体を返す (改善点メモも同梱 — 答える直前に再表示する)。
    const byNo = new Map(visible.map((q) => [q.no, q]));
    const ordered = started.set.questionNos.flatMap((no) => {
      const q = byNo.get(no);
      return q ? [q] : [];
    });
    const rows = await attachFixNotes(
      db,
      caller.tenantId,
      caller.id,
      attachProgressRows(enrichQuestionRows(ordered, personalByQuestion), progressByNo),
    );

    return c.json({
      set: serializePracticeSet(started.set),
      resumed: started.resumed,
      rows,
      prepPercent: startedPercent,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 受講者・管理者: セットを終了する (`{ status: "done" }`)。 全問終えた場合も途中で切り上げた
 * 場合も同じで、 レスポンスに終了サマリ (できた n/10 と準備率の伸び) を返す。
 */
interviewPrepRoute.put("/api/interview-prep/practice-set/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanPracticeInterviewPrep(caller);
    const id = c.req.param("id");

    const body = (await c.req.json()) as { status?: unknown };
    if (body.status !== "done") {
      throw new ApiError('status は "done" で指定してください', 400);
    }

    const finished = await finishPracticeSet({
      db,
      tenantId: caller.tenantId,
      profileId: caller.id,
      setId: id,
    });
    if (!finished) throw new ApiError("練習セットが見つかりません", 404);

    const { visible, personalByQuestion, progressByNo } = await loadLearnerPrepContext(
      db,
      caller.tenantId,
      caller.id,
    );
    const currentPercent = prepPercentOf(visible, personalByQuestion, progressByNo);

    return c.json({
      set: serializePracticeSet(finished),
      summary: summarizePracticeSet({
        questionNos: finished.questionNos,
        completedNos: finished.completedNos,
        confidentNos: finished.confidentNos,
        startedPercent: finished.startedPercent,
        currentPercent,
      }),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 受講者・管理者: 質問ごとの学習ステータスを更新する (準備ホーム / 練習の自己評価)。
 * body.event:
 *   - "read"      … 型を読んだ (行がなければ作る。 confident は下げない)
 *   - "practiced" … 「もう一度」— 練習回数を加算し、 SM-2 は誤答として進める
 *   - "confident" … 「できた」— 練習OK。 SM-2 は正解として進める
 *
 * body.setId があれば「今日の練習セット」(Issue #235) の消化としても記録する。
 */
interviewPrepRoute.put("/api/interview-prep/progress/:no", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanPracticeInterviewPrep(caller);
    const no = parseQuestionNoParam(c.req.param("no"));

    const body = (await c.req.json()) as { event?: unknown; setId?: unknown };
    const event = body.event;
    if (event !== "read" && event !== "practiced" && event !== "confident") {
      throw new ApiError("event は read / practiced / confident のいずれかで指定してください", 400);
    }
    if (body.setId !== undefined && typeof body.setId !== "string") {
      throw new ApiError("setId は文字列で指定してください", 400);
    }

    // 記録できるのは自分の割当範囲の質問だけ (staff の全件 read 権限では通さない)。
    await loadVisibleQuestion(c, no, { scope: "self-practice" });

    const practiced = event !== "read";
    const now = new Date();

    /**
     * SM-2 は現在のカード状態から次を計算するため、 ここだけは読んでから書く
     * (デイリー復習の `applyOutcomesToCards` と同じ形)。 自己評価の二重送信が
     * 重なると ease が 1 回ぶん古い値から計算されうるが、 次の評価で追いつく。
     */
    const existing = practiced
      ? (await loadInterviewProgress(db, caller.tenantId, caller.id)).get(no)
      : undefined;
    const srs = practiced
      ? nextInterviewSrs(existing, event === "confident" ? "good" : "again", now)
      : null;

    /**
     * SELECT → INSERT/UPDATE に分けると、 同じ質問への更新が重なったとき
     * (「型を読んだ」の直後に「できた」を押すなど) に
     *   - 双方が行なしと判断して INSERT が衝突し 500 になる
     *   - practiced_count を古い値から計算して加算が失われる
     *   - 後着の practiced が先着の confident を read へ引き下げる
     * が起こりうる。 単一の upsert にして、 更新値は現在行を参照する SQL 式で決める。
     */
    await db
      .insert(interviewProgress)
      .values({
        tenantId: caller.tenantId,
        profileId: caller.id,
        questionNo: no,
        status: event === "confident" ? "confident" : "read",
        practicedCount: practiced ? 1 : 0,
        lastPracticedAt: practiced ? now : null,
        ...(srs
          ? {
              srsEase: srs.ease,
              srsIntervalDays: srs.intervalDays,
              srsReps: srs.reps,
              srsDueDate: srs.dueDate,
              lastResult: srs.lastResult,
            }
          : {}),
      })
      .onConflictDoUpdate({
        target: [
          interviewProgress.tenantId,
          interviewProgress.profileId,
          interviewProgress.questionNo,
        ],
        set: {
          // confident は一度立ったら下がらない。 read / practiced は現状維持。
          status:
            event === "confident"
              ? sql`'confident'`
              : sql`CASE WHEN ${interviewProgress.status} = 'confident' THEN 'confident' ELSE 'read' END`,
          // 加算は現在値を参照する式で行う (読み取り値からの計算にしない)。
          practicedCount: practiced
            ? sql`${interviewProgress.practicedCount} + 1`
            : sql`${interviewProgress.practicedCount}`,
          ...(practiced ? { lastPracticedAt: now } : {}),
          ...(srs
            ? {
                srsEase: srs.ease,
                srsIntervalDays: srs.intervalDays,
                srsReps: srs.reps,
                srsDueDate: srs.dueDate,
                lastResult: srs.lastResult,
              }
            : {}),
          updatedAt: now,
        },
      });

    // セット内の自己評価なら消化済みとして記録する (中断・再開と終了サマリの元データ)。
    let set: PracticeSetRow | null = null;
    /**
     * セットへ記録できたか。 `setId` を渡していない (セット外の練習) ときは true。
     * 競合が続いた場合や、 別タブが先にセットを終了していた場合は false になり、
     * クライアントはその 1 問の楽観更新を戻してやり直せる — 200 のまま黙って
     * 返すと、 記録されていない回答を「できた」として数えたサマリになる。
     */
    let setRecorded = true;
    if (practiced && typeof body.setId === "string" && body.setId !== "") {
      set = await recordPracticeSetAnswer({
        db,
        tenantId: caller.tenantId,
        profileId: caller.id,
        setId: body.setId,
        questionNo: no,
        confident: event === "confident",
      });
      setRecorded = set !== null;
    }

    return c.json({
      ok: true,
      due_date: srs?.dueDate ?? null,
      interval_days: srs?.intervalDays ?? null,
      set: set ? serializePracticeSet(set) : null,
      set_recorded: setRecorded,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------------------
// 改善点メモ (Issue #234): 振り返りで受講者が書き、 次回その質問に答える直前に再表示する。
// ---------------------------------------------------------------------------

/**
 * 受講者: 質問に改善点メモを 1 行足す。 定型チップも自由入力も同じ扱い。
 * 溜まりすぎると練習直前の再表示が読めなくなるため、 未解決の上限を超えたら 400。
 */
/** 未解決メモの上限に達したときのエラー文 (追加・消し込みの取り消しで共用)。 */
function unresolvedLimitMessage(): string {
  return `未解決の改善点メモは 1 問あたり ${FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION} 件までです。 克服したものを消し込んでください`;
}

/** その質問に付いている自分のメモ (未解決の件数を数えるのに使う)。 */
async function loadFixNotesForQuestion(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  profileId: string,
  questionNo: number,
): Promise<Array<{ resolvedAt: Date | string | null }>> {
  return db
    .select({ resolvedAt: interviewFixNotes.resolvedAt })
    .from(interviewFixNotes)
    .where(
      and(
        eq(interviewFixNotes.tenantId, tenantId),
        eq(interviewFixNotes.profileId, profileId),
        eq(interviewFixNotes.questionNo, questionNo),
      ),
    );
}

interviewPrepRoute.post("/api/interview-prep/fix-notes/:no", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanPracticeInterviewPrep(caller);
    const no = parseQuestionNoParam(c.req.param("no"));

    const body = (await c.req.json()) as { text?: unknown };
    const text = normalizeFixNoteText(body.text);
    if (text === "") throw new ApiError("text が必要です", 400);

    // メモも自分の割当範囲の質問にだけ付けられる (進捗と同じ可視性)。
    await loadVisibleQuestion(c, no, { scope: "self-practice" });

    const existing = await loadFixNotesForQuestion(db, caller.tenantId, caller.id, no);
    if (
      existing.filter((n) => n.resolvedAt == null).length >= FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION
    ) {
      throw new ApiError(unresolvedLimitMessage(), 400);
    }

    const inserted = await db
      .insert(interviewFixNotes)
      .values({
        tenantId: caller.tenantId,
        profileId: caller.id,
        questionNo: no,
        text,
      })
      .returning({
        id: interviewFixNotes.id,
        questionNo: interviewFixNotes.questionNo,
        text: interviewFixNotes.text,
        createdAt: interviewFixNotes.createdAt,
        resolvedAt: interviewFixNotes.resolvedAt,
      });
    const row = inserted[0];
    if (!row) throw new ApiError("改善点メモを保存できませんでした", 500);

    return c.json({ note: serializeFixNote(row) }, 201);
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 受講者・管理者: 改善点メモの消し込み (`{ resolved: true }`) と取り消し (`false`)。 */
interviewPrepRoute.put("/api/interview-prep/fix-notes/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanPracticeInterviewPrep(caller);
    const id = c.req.param("id");

    const body = (await c.req.json()) as { resolved?: unknown };
    if (typeof body.resolved !== "boolean") {
      throw new ApiError("resolved は真偽値で指定してください", 400);
    }

    if (!body.resolved) {
      // 消し込みの取り消しも上限の対象。 消し込んで足して戻す、 を繰り返せば
      // 未解決が上限を超え、 練習直前の再表示が読めない量になってしまう。
      const target = await db
        .select({
          questionNo: interviewFixNotes.questionNo,
          resolvedAt: interviewFixNotes.resolvedAt,
        })
        .from(interviewFixNotes)
        .where(
          and(
            eq(interviewFixNotes.id, id),
            eq(interviewFixNotes.tenantId, caller.tenantId),
            eq(interviewFixNotes.profileId, caller.id),
          ),
        )
        .limit(1);
      if (!target[0]) throw new ApiError("改善点メモが見つかりません", 404);
      if (target[0].resolvedAt != null) {
        const siblings = await loadFixNotesForQuestion(
          db,
          caller.tenantId,
          caller.id,
          target[0].questionNo,
        );
        if (
          siblings.filter((n) => n.resolvedAt == null).length >=
          FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION
        ) {
          throw new ApiError(unresolvedLimitMessage(), 400);
        }
      }
    }

    // 他人のメモを触れないよう、 更新条件にテナントと本人を含める (無ければ 404)。
    const updated = await db
      .update(interviewFixNotes)
      .set({ resolvedAt: body.resolved ? new Date() : null })
      .where(
        and(
          eq(interviewFixNotes.id, id),
          eq(interviewFixNotes.tenantId, caller.tenantId),
          eq(interviewFixNotes.profileId, caller.id),
        ),
      )
      .returning({
        id: interviewFixNotes.id,
        questionNo: interviewFixNotes.questionNo,
        text: interviewFixNotes.text,
        createdAt: interviewFixNotes.createdAt,
        resolvedAt: interviewFixNotes.resolvedAt,
      });
    const row = updated[0];
    if (!row) throw new ApiError("改善点メモが見つかりません", 404);

    return c.json({ note: serializeFixNote(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
