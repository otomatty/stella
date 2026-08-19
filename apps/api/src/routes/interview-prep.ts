/**
 * 面談対策 (Interview Prep) API。
 *
 * アプリ層認可:
 *   - 受講者: 割当カテゴリ + 全案件共通の質問のみ read
 *   - staff (instructor/admin/platform_admin): 質問全件 read、 割当の read/write
 */

import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";

import { ASSIGNABLE_CATEGORIES, isAssignableCategory } from "@falcon/shared/interview/types";
import type { InterviewQuestion } from "@falcon/shared/interview/types";
import { visibleQuestions } from "@falcon/shared/interview/filter";

import { interviewPrepAssignments, interviewQuestions, profiles } from "../db/schema.js";
import { ApiError, errorResponse, getCaller, isStaffRole, requireRole } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
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

/** 質問一覧。 受講者は割当カテゴリ + 共通のみ、 staff は全件。 */
interviewPrepRoute.get("/api/interview-prep/questions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows: InterviewQuestion[] = await db
      .select(Q_SELECT)
      .from(interviewQuestions)
      .where(eq(interviewQuestions.tenantId, caller.tenantId))
      .orderBy(asc(interviewQuestions.no));
    if (isStaffRole(caller.role)) {
      return c.json({ rows, assignedCategories: [...ASSIGNABLE_CATEGORIES] });
    }
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
    const categories = assigned[0]?.categories ?? [];
    return c.json({
      rows: visibleQuestions(rows, categories),
      assignedCategories: categories,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: テナント内の受講者一覧 + 割当カテゴリ (割当管理画面用)。 */
interviewPrepRoute.get("/api/interview-prep/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
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
      })
      .from(interviewPrepAssignments)
      .where(eq(interviewPrepAssignments.tenantId, caller.tenantId));
    const byProfile = new Map(assignments.map((a) => [a.profile_id, a.categories]));
    return c.json({
      rows: students.map((s) => ({
        ...s,
        categories: byProfile.get(s.profile_id) ?? [],
      })),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 受講者の割当カテゴリを upsert する。 */
interviewPrepRoute.put("/api/interview-prep/assignments/:profileId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const profileId = c.req.param("profileId");
    const body = (await c.req.json()) as { categories?: unknown };
    if (!Array.isArray(body.categories) || !body.categories.every(isAssignableCategory)) {
      throw new ApiError(
        `categories は ${ASSIGNABLE_CATEGORIES.join(" / ")} の配列で指定してください`,
        400,
      );
    }
    const categories: string[] = body.categories;
    const target = await db
      .select({ id: profiles.id, tenantId: profiles.tenantId })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (!target[0] || target[0].tenantId !== caller.tenantId) {
      throw new ApiError("対象の受講者が見つかりません", 404);
    }
    await db
      .insert(interviewPrepAssignments)
      .values({
        tenantId: caller.tenantId,
        profileId,
        categories,
        assignedBy: caller.id,
      })
      .onConflictDoUpdate({
        target: [interviewPrepAssignments.tenantId, interviewPrepAssignments.profileId],
        set: { categories, assignedBy: caller.id, updatedAt: new Date() },
      });
    await recordAudit(db, caller, {
      action: "interview_prep_assign",
      targetType: "interview_prep_assignment",
      targetId: profileId,
      ip: clientIp(c),
      metadata: { categories },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
