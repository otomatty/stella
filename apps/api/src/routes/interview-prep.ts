/**
 * 面談対策 (Interview Prep) API。
 *
 * アプリ層認可:
 *   - 受講者: 割当カテゴリ + 全案件共通の質問のみ read
 *   - canManageInterviewPrep (instructor/admin/platform_admin/sales): 質問全件 read、 割当の read/write
 *   - interviewDate / note の write: sales/admin/platform_admin のみ (Issue #205)
 */

import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";

import { ASSIGNABLE_CATEGORIES, isAssignableCategory } from "@falcon/shared/interview/types";
import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { visibleQuestions } from "@falcon/shared/interview/filter";

import {
  interviewPrepAssignments,
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
} from "../lib/authz.js";
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
          rows: enrichQuestionRows(visible, personalByQuestion),
          assignedCategories: categories,
          interviewDate: assigned[0]?.interviewDate ?? null,
          note: assigned[0]?.note ?? null,
          profileId: profileIdParam,
        });
      }
      return c.json({
        rows: mapStaffQuestionRows(rows),
        assignedCategories: [...ASSIGNABLE_CATEGORIES],
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
      rows: enrichQuestionRows(visible, personalByQuestion),
      assignedCategories: categories,
      interviewDate: assigned[0]?.interviewDate ?? null,
      note: assigned[0]?.note ?? null,
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
