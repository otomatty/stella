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
  interviewPrepAssignments,
  interviewProgress,
  interviewQuestions,
  notifications,
  profiles,
} from "../db/schema.js";
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

function ttsKey(no: number): string {
  return `${TTS_PREFIX}/${no}.mp3`;
}

/**
 * R2 上に音声が登録済みの質問番号を列挙する (質問一覧・管理画面の表示用)。
 * 音声は任意の付加機能なので、 R2 の一時障害で質問一覧そのものを落とさない
 * (失敗時は空配列 = 再生ボタンを出さないだけ)。
 */
async function listAudioNos(bucket: R2Bucket | undefined): Promise<number[]> {
  if (!bucket) return [];
  try {
    const nos: number[] = [];
    let cursor: string | undefined;
    do {
      const page = await bucket.list({ prefix: `${TTS_PREFIX}/`, cursor });
      for (const obj of page.objects) {
        const no = Number.parseInt(obj.key.slice(TTS_PREFIX.length + 1), 10);
        if (Number.isInteger(no) && no > 0) nos.push(no);
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return nos.sort((a, b) => a - b);
  } catch (e) {
    console.error("[interview-prep] failed to list question audio; serving without it", e);
    return [];
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

function sortAssignmentRows<T extends { interviewDate?: string | null; display_name?: string }>(
  rows: T[],
): T[] {
  const dated = rows
    .filter((r) => r.interviewDate)
    .sort((a, b) => String(a.interviewDate).localeCompare(String(b.interviewDate)));
  const undated = rows
    .filter((r) => !r.interviewDate)
    .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
  return [...dated, ...undated];
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

/** 質問ごとの学習ステータス (interview_progress) を行に同梱する。 行なし = 未着手。 */
async function attachProgress<T extends { no: number }>(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  profileId: string,
  rows: T[],
): Promise<Array<T & { progress_status: "read" | "confident" | null; practiced_count: number }>> {
  const progressRows = await db
    .select({
      questionNo: interviewProgress.questionNo,
      status: interviewProgress.status,
      practicedCount: interviewProgress.practicedCount,
    })
    .from(interviewProgress)
    .where(
      and(eq(interviewProgress.tenantId, tenantId), eq(interviewProgress.profileId, profileId)),
    );
  const byNo = new Map(progressRows.map((p) => [p.questionNo, p]));
  return rows.map((row) => {
    const p = byNo.get(row.no);
    return {
      ...row,
      progress_status: p?.status ?? null,
      practiced_count: p?.practicedCount ?? 0,
    };
  });
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
    // 読み上げ音声が登録済みの質問番号。 UI はこれに含まれる質問だけ再生ボタンを出す。
    const audioNos = await listAudioNos(c.env.MATERIALS_BUCKET);

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
          rows: await attachProgress(
            db,
            caller.tenantId,
            profileIdParam,
            enrichQuestionRows(visible, personalByQuestion),
          ),
          assignedCategories: categories,
          interviewDate: assigned[0]?.interviewDate ?? null,
          note: assigned[0]?.note ?? null,
          profileId: profileIdParam,
          audioNos,
        });
      }
      return c.json({
        rows: mapStaffQuestionRows(rows),
        assignedCategories: [...ASSIGNABLE_CATEGORIES],
        audioNos,
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
      rows: await attachProgress(
        db,
        caller.tenantId,
        caller.id,
        enrichQuestionRows(visible, personalByQuestion),
      ),
      assignedCategories: categories,
      interviewDate: assigned[0]?.interviewDate ?? null,
      note: assigned[0]?.note ?? null,
      audioNos,
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
    const rows = sortAssignmentRows(
      students.map((s) => {
        const assignment = byProfile.get(s.profile_id);
        return {
          ...s,
          categories: assignment?.categories ?? [],
          interviewDate: assignment?.interviewDate ?? null,
          note: assignment?.note ?? null,
        };
      }),
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
 * 質問文の読み上げ音声 (MP3) の配信。 admin が事前生成して R2 に登録した音声を
 * 返すだけで、 ここでは AI を呼ばない。 未登録は 404 (UI は再生ボタンを出さない)。
 */
interviewPrepRoute.get("/api/interview-prep/questions/:no/audio", async (c) => {
  try {
    const no = Number.parseInt(c.req.param("no"), 10);
    if (!Number.isInteger(no) || no <= 0) throw new ApiError("質問番号が不正です", 400);
    await loadVisibleQuestion(c, no);

    const bucket = c.env.MATERIALS_BUCKET;
    if (!bucket) throw new ApiError("音声機能は未設定です (R2 バインディングなし)", 503);
    const object = await bucket.get(ttsKey(no));
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
 * admin: 指定した質問の読み上げ音声を TTS モデル (既定 Grok TTS) で生成し R2 へ登録する。
 * 既存キーは上書き (= 再生成)。 コスト管理のため生成はこのエンドポイントに閉じ、
 * 1 回の呼び出しで最大 TTS_BATCH_LIMIT 問まで直列に処理する。
 */
interviewPrepRoute.post("/api/interview-prep/audio/generate", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "admin", "platform_admin");

    const body = (await c.req.json()) as { nos?: unknown };
    if (
      !Array.isArray(body.nos) ||
      body.nos.length === 0 ||
      !body.nos.every((n): n is number => Number.isInteger(n) && (n as number) > 0)
    ) {
      throw new ApiError("nos は質問番号 (正の整数) の配列で指定してください", 400);
    }
    if (body.nos.length > TTS_BATCH_LIMIT) {
      throw new ApiError(`一度に生成できるのは ${TTS_BATCH_LIMIT} 問までです`, 400);
    }

    if (!workersAiConfigured(c.env)) {
      throw new ApiError("音声機能は未設定です (WORKERS_AI_API_TOKEN を設定してください)", 503);
    }
    const bucket = c.env.MATERIALS_BUCKET;
    if (!bucket) throw new ApiError("音声機能は未設定です (R2 バインディングなし)", 503);

    const limited = await enforceAiRateLimit(c);
    if (limited) return limited;

    const questions = await db
      .select({ no: interviewQuestions.no, question: interviewQuestions.question })
      .from(interviewQuestions)
      .where(eq(interviewQuestions.tenantId, caller.tenantId));
    const byNo = new Map(questions.map((q) => [q.no, q.question]));

    const lang = c.env.INTERVIEW_TTS_LANG ?? "ja";
    const results: Array<{ no: number; ok: boolean; error?: string }> = [];
    for (const no of body.nos) {
      const text = byNo.get(no);
      if (!text) {
        results.push({ no, ok: false, error: "質問が見つかりません" });
        continue;
      }
      try {
        const bytes = await synthesizeSpeech(c.env, text, lang);
        await bucket.put(ttsKey(no), bytes, { httpMetadata: { contentType: "audio/mpeg" } });
        results.push({ no, ok: true });
      } catch (e) {
        results.push({ no, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    await recordAudit(db, caller, {
      action: "interview_tts_generate",
      targetType: "interview_question_audio",
      targetId: body.nos.join(","),
      ip: clientIp(c),
      metadata: { requested: body.nos.length, succeeded: results.filter((r) => r.ok).length },
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

/**
 * 受講者: 質問ごとの学習ステータスを更新する (準備ホーム / 練習の自己評価)。
 * body.event:
 *   - "read"      … 型を読んだ (行がなければ作る。 confident は下げない)
 *   - "practiced" … 「もう一度」— 練習回数だけ加算 (ステータス維持)
 *   - "confident" … 「できた」— 練習OK
 */
interviewPrepRoute.put("/api/interview-prep/progress/:no", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "student");
    const no = Number.parseInt(c.req.param("no"), 10);
    if (!Number.isInteger(no) || no <= 0) throw new ApiError("質問番号が不正です", 400);

    const body = (await c.req.json()) as { event?: unknown };
    const event = body.event;
    if (event !== "read" && event !== "practiced" && event !== "confident") {
      throw new ApiError("event は read / practiced / confident のいずれかで指定してください", 400);
    }

    await loadVisibleQuestion(c, no);

    const practiced = event !== "read";
    const now = new Date();

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
          updatedAt: now,
        },
      });

    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
