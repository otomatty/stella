/**
 * 面談対策 (Interview Prep) API。
 *
 * アプリ層認可:
 *   - 受講者: 割当カテゴリ + 全案件共通の質問のみ read
 *   - canManageInterviewPrep (instructor/admin/platform_admin/sales): 質問全件 read、 割当の read/write
 *   - interviewDate / note の write: sales/admin/platform_admin のみ (Issue #205)
 */

import { Hono } from "hono";
import { and, asc, eq, sql } from "drizzle-orm";

import { ASSIGNABLE_CATEGORIES, isAssignableCategory } from "@falcon/shared/interview/types";
import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { visibleQuestions } from "@falcon/shared/interview/filter";
import {
  type InterviewAudioPart,
  type InterviewAudioSegment,
  interviewAudioObjectName,
  interviewAudioSegmentId,
  interviewAudioSegments,
  isInterviewAudioPart,
  parseInterviewAudioObjectName,
} from "@falcon/shared/interview/audio";
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
  canManageInterviewPrep,
  canWriteInterviewSchedule,
  requireCanManageInterviewPrep,
  requireRole,
} from "../lib/authz.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";
import { synthesizeSpeech, transcribeAudio, workersAiConfigured } from "../lib/workers-ai.js";
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
  deep1: interviewQuestions.deep1,
  deep2: interviewQuestions.deep2,
  deep3: interviewQuestions.deep3,
  ng: interviewQuestions.ng,
  criteria: interviewQuestions.criteria,
  is_reverse: interviewQuestions.isReverse,
} as const;

/**
 * 質問音声の R2 プレフィックス。 質問データは全テナント共通の正本 (questions.json seed)
 * のためキーは質問番号のみで、 テナントをまたいで共有する。 教材の `tenant/<id>/` 配下
 * ではないため孤児掃除 (`/api/admin/r2/orphans`) の走査対象にならない。
 */
const TTS_PREFIX = "interview-tts";

/** 1 リクエストで生成できる質問数の上限 (TTS 呼び出しの直列実行時間を抑える)。 */
const TTS_BATCH_LIMIT = 10;

/** 練習録音の受け付け上限。 webm/opus なら 10 分超に相当し、 base64 化しても Workers の制限内。 */
const MAX_RECORDING_BYTES = 8 * 1024 * 1024;

function ttsKey(no: number, part: InterviewAudioPart = "question"): string {
  return `${TTS_PREFIX}/${interviewAudioObjectName(no, part)}`;
}

/**
 * R2 上に音声が登録済みのセグメントを列挙する (質問一覧・管理画面の表示用)。
 * 音声は任意の付加機能なので、 R2 の一時障害で質問一覧そのものを落とさない
 * (失敗時は空 = 再生ボタンを出さないだけ)。
 *
 * `audioNos` は質問文の音声だけ (既存クライアント互換)、 `audioSegments` は
 * 深掘りを含む全セグメント (`12:deep1` 形式) を返す。
 */
async function listAudioSegments(
  bucket: R2Bucket | undefined,
): Promise<{ audioNos: number[]; audioSegments: string[] }> {
  if (!bucket) return { audioNos: [], audioSegments: [] };
  try {
    const nos: number[] = [];
    const segments: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await bucket.list({ prefix: `${TTS_PREFIX}/`, cursor });
      for (const obj of page.objects) {
        const parsed = parseInterviewAudioObjectName(obj.key.slice(TTS_PREFIX.length + 1));
        if (!parsed) continue;
        if (parsed.part === "question") nos.push(parsed.no);
        segments.push(interviewAudioSegmentId(parsed.no, parsed.part));
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return { audioNos: nos.sort((a, b) => a - b), audioSegments: segments.sort() };
  } catch (e) {
    console.error("[interview-prep] failed to list question audio; serving without it", e);
    return { audioNos: [], audioSegments: [] };
  }
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

async function assertLearnerInTenant(
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
  if (target[0].role !== "student") {
    throw new ApiError("面談対策の回答の型は受講者のみ対象です", 400);
  }
}

function mapStaffQuestionRows(rows: InterviewQuestion[]) {
  return rows.map((row) => ({
    ...row,
    answer_template:
      row.answer_template != null ? plainCommonAnswerTemplate(row.answer_template) : null,
  }));
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
    // 読み上げ音声が登録済みのセグメント。 UI はこれに含まれるものだけ再生する。
    const { audioNos, audioSegments } = await listAudioSegments(c.env.MATERIALS_BUCKET);

    if (canManageInterviewPrep(caller.role)) {
      if (profileIdParam) {
        await assertLearnerInTenant(db, caller.tenantId, profileIdParam);
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
          audioNos,
          audioSegments,
          activeSet: summarizeActiveSet(
            await loadActivePracticeSet(db, caller.tenantId, profileIdParam),
          ),
        });
      }
      return c.json({
        rows: mapStaffQuestionRows(rows),
        assignedCategories: [...ASSIGNABLE_CATEGORIES],
        audioNos,
        audioSegments,
      });
    }

    if (profileIdParam && profileIdParam !== caller.id) {
      throw new ApiError("権限がありません", 403);
    }
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
      audioNos,
      audioSegments,
      // 中断したセットがあれば準備ホームに「途中のセットを再開」を出す (Issue #235)。
      activeSet: summarizeActiveSet(await loadActivePracticeSet(db, caller.tenantId, caller.id)),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: テナント内の受講者一覧 + 割当カテゴリ (割当管理画面用)。 */
interviewPrepRoute.get("/api/interview-prep/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireCanManageInterviewPrep(caller);
    const students = await db
      .select({
        profile_id: profiles.id,
        display_name: profiles.displayName,
        email: profiles.email,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.tenantId, caller.tenantId),
          eq(profiles.role, "student"),
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
      new Map(students.map((s) => [s.profile_id, byProfile.get(s.profile_id)?.categories ?? []])),
    );
    // 「面談が近い順」: これから → 済んだ面談 → 未設定 (並び順の正本は shared)。
    const rows = sortByInterviewDate(
      students.map((s) => {
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
    if (target[0].role !== "student") {
      throw new ApiError("面談対策の割当は受講者のみ対象です", 400);
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

    await assertLearnerInTenant(db, caller.tenantId, profileId);

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
        await assertLearnerInTenant(db, caller.tenantId, profileId);
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
 * 生成対象セグメントの解釈。 `nos` は質問文のみ、 `segments` は深掘りを含む指定。
 * 重複は畳んで、 合計が TTS_BATCH_LIMIT を超えたら 400 (直列生成の実行時間を抑える)。
 */
function parseAudioGenerateTargets(body: {
  nos?: unknown;
  segments?: unknown;
}): Array<{ no: number; part: InterviewAudioPart }> {
  const targets: Array<{ no: number; part: InterviewAudioPart }> = [];
  const seen = new Set<string>();
  const push = (no: number, part: InterviewAudioPart) => {
    const id = interviewAudioSegmentId(no, part);
    if (seen.has(id)) return;
    seen.add(id);
    targets.push({ no, part });
  };

  if (body.nos !== undefined) {
    if (
      !Array.isArray(body.nos) ||
      !body.nos.every((n): n is number => Number.isInteger(n) && (n as number) > 0)
    ) {
      throw new ApiError("nos は質問番号 (正の整数) の配列で指定してください", 400);
    }
    for (const no of body.nos) push(no, "question");
  }
  if (body.segments !== undefined) {
    if (!Array.isArray(body.segments)) {
      throw new ApiError("segments は { no, part } の配列で指定してください", 400);
    }
    for (const raw of body.segments) {
      const seg = raw as { no?: unknown; part?: unknown };
      if (!Number.isInteger(seg.no) || (seg.no as number) <= 0 || !isInterviewAudioPart(seg.part)) {
        throw new ApiError("segments は { no, part } の配列で指定してください", 400);
      }
      push(seg.no as number, seg.part);
    }
  }

  if (targets.length === 0) {
    throw new ApiError("nos は質問番号 (正の整数) の配列で指定してください", 400);
  }
  if (targets.length > TTS_BATCH_LIMIT) {
    throw new ApiError(`一度に生成できるのは ${TTS_BATCH_LIMIT} 件までです`, 400);
  }
  return targets;
}

// ---------------------------------------------------------------------------
// 音声 (Workers AI): 質問読み上げは admin が事前生成して R2 登録、 受講者向け GET は
// 配信のみで AI を呼ばない。 回答の文字起こしは Whisper large-v3-turbo。
// ---------------------------------------------------------------------------

/**
 * 質問 1 件を取り出しつつ read 権限を検査する。
 * 受講者は割当カテゴリ + 共通の範囲外なら 403 (一覧 API と同じ可視性)。
 */
async function loadVisibleQuestion(
  c: Parameters<typeof getCaller>[0],
  no: number,
): Promise<InterviewQuestion> {
  const { caller, db } = await getCaller(c);
  const rows: InterviewQuestion[] = await db
    .select(Q_SELECT)
    .from(interviewQuestions)
    .where(and(eq(interviewQuestions.tenantId, caller.tenantId), eq(interviewQuestions.no, no)))
    .limit(1);
  const question = rows[0];
  if (!question) throw new ApiError("質問が見つかりません", 404);
  if (!canManageInterviewPrep(caller.role)) {
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
  return question;
}

/**
 * 読み上げ音声 (MP3) の配信。 admin が事前生成して R2 に登録した音声を返すだけで、
 * ここでは AI を呼ばない。 未登録は 404 (UI は再生ボタンを出さない)。
 * `?part=deep1` で深掘り①〜③の音声も同じ経路で配信する (Issue #234)。
 */
interviewPrepRoute.get("/api/interview-prep/questions/:no/audio", async (c) => {
  try {
    const no = Number.parseInt(c.req.param("no"), 10);
    if (!Number.isInteger(no) || no <= 0) throw new ApiError("質問番号が不正です", 400);
    const partParam = c.req.query("part") ?? "question";
    if (!isInterviewAudioPart(partParam)) {
      throw new ApiError("part は question / deep1 / deep2 / deep3 で指定してください", 400);
    }
    await loadVisibleQuestion(c, no);

    const bucket = c.env.MATERIALS_BUCKET;
    if (!bucket) throw new ApiError("音声機能は未設定です (R2 バインディングなし)", 503);
    const object = await bucket.get(ttsKey(no, partParam));
    if (!object) throw new ApiError("この質問の音声は未登録です", 404);

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
 * admin: 指定したセグメント (質問文 / 深掘り①〜③) の読み上げ音声を TTS モデル
 * (既定 Grok TTS) で生成し R2 へ登録する。 既存キーは上書き (= 再生成)。
 * コスト管理のため生成はこのエンドポイントに閉じ、 1 回の呼び出しで最大
 * TTS_BATCH_LIMIT セグメントまで直列に処理する。
 *
 * body は `{ nos: number[] }` (質問文のみ — 従来の形) と
 * `{ segments: [{ no, part }] }` (深掘りを含む) の両方を受ける。
 */
interviewPrepRoute.post("/api/interview-prep/audio/generate", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "admin", "platform_admin");

    const body = (await c.req.json()) as { nos?: unknown; segments?: unknown };
    const requested = parseAudioGenerateTargets(body);

    if (!workersAiConfigured(c.env)) {
      throw new ApiError("音声機能は未設定です (WORKERS_AI_API_TOKEN を設定してください)", 503);
    }
    const bucket = c.env.MATERIALS_BUCKET;
    if (!bucket) throw new ApiError("音声機能は未設定です (R2 バインディングなし)", 503);

    const limited = await enforceAiRateLimit(c);
    if (limited) return limited;

    const questions = await db
      .select({
        no: interviewQuestions.no,
        question: interviewQuestions.question,
        deep1: interviewQuestions.deep1,
        deep2: interviewQuestions.deep2,
        deep3: interviewQuestions.deep3,
      })
      .from(interviewQuestions)
      .where(eq(interviewQuestions.tenantId, caller.tenantId));
    /** 質問番号 → セグメント (質問文 + 本文のある深掘り) の読み上げテキスト。 */
    const textByNo = new Map<number, Map<InterviewAudioPart, string>>();
    for (const q of questions) {
      const segments: InterviewAudioSegment[] = interviewAudioSegments(q);
      textByNo.set(q.no, new Map(segments.map((seg) => [seg.part, seg.text])));
    }

    const lang = c.env.INTERVIEW_TTS_LANG ?? "ja";
    const results: Array<{ no: number; part: InterviewAudioPart; ok: boolean; error?: string }> =
      [];
    for (const target of requested) {
      const text = textByNo.get(target.no)?.get(target.part);
      if (!text) {
        results.push({
          ...target,
          ok: false,
          error: target.part === "question" ? "質問が見つかりません" : "この深掘りは空です",
        });
        continue;
      }
      try {
        const bytes = await synthesizeSpeech(c.env, text, lang);
        await bucket.put(ttsKey(target.no, target.part), bytes, {
          httpMetadata: { contentType: "audio/mpeg" },
        });
        results.push({ ...target, ok: true });
      } catch (e) {
        results.push({
          ...target,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    await recordAudit(db, caller, {
      action: "interview_tts_generate",
      targetType: "interview_question_audio",
      targetId: requested.map((t) => interviewAudioSegmentId(t.no, t.part)).join(","),
      ip: clientIp(c),
      metadata: { requested: requested.length, succeeded: results.filter((r) => r.ok).length },
    });
    return c.json({ results });
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
      question = await loadVisibleQuestion(c, no);
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
 * 受講者: 「今日の練習セット」を取得する。 進行中のセットがあればそれをそのまま返し
 * (= 中断からの再開)、 無ければ SM-2 で 10 問を選んで作る。
 *
 * 優先度は `selectPracticeSet` に閉じている: 「もう一度」→ 未着手・未練習 →
 * 期日を過ぎた `練習OK`、 それでも埋まらないときだけ期日前を前倒しで補充する。
 * 対象は割当カテゴリの A 必修のみ (逆質問は「聞く質問」なので出さない)。
 */
interviewPrepRoute.get("/api/interview-prep/practice-set", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "student");

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
 * 受講者: セットを終了する (`{ status: "done" }`)。 全問終えた場合も途中で切り上げた
 * 場合も同じで、 レスポンスに終了サマリ (できた n/10 と準備率の伸び) を返す。
 */
interviewPrepRoute.put("/api/interview-prep/practice-set/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "student");
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
 * 受講者: 質問ごとの学習ステータスを更新する (準備ホーム / 練習の自己評価)。
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
    requireRole(caller, "student");
    const no = Number.parseInt(c.req.param("no"), 10);
    if (!Number.isInteger(no) || no <= 0) throw new ApiError("質問番号が不正です", 400);

    const body = (await c.req.json()) as { event?: unknown; setId?: unknown };
    const event = body.event;
    if (event !== "read" && event !== "practiced" && event !== "confident") {
      throw new ApiError("event は read / practiced / confident のいずれかで指定してください", 400);
    }
    if (body.setId !== undefined && typeof body.setId !== "string") {
      throw new ApiError("setId は文字列で指定してください", 400);
    }

    await loadVisibleQuestion(c, no);

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
    requireRole(caller, "student");
    const no = Number.parseInt(c.req.param("no"), 10);
    if (!Number.isInteger(no) || no <= 0) throw new ApiError("質問番号が不正です", 400);

    const body = (await c.req.json()) as { text?: unknown };
    const text = normalizeFixNoteText(body.text);
    if (text === "") throw new ApiError("text が必要です", 400);

    await loadVisibleQuestion(c, no);

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

/** 受講者: 改善点メモの消し込み (`{ resolved: true }`) と取り消し (`false`)。 */
interviewPrepRoute.put("/api/interview-prep/fix-notes/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "student");
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
