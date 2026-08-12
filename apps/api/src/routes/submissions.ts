/**
 * 課題提出 / 添削 API (旧 submissions テーブル + RLS + notify_review_completed トリガー / Issue #8)。
 *
 * 認可 (旧 RLS):
 *   - 受講者は自分の提出のみ insert (student_id = caller)。
 *   - 受講者は mine / 本人の :id を select 可。
 *   - 講師 / 管理者は同テナントの提出を一覧 / 更新。
 * 添削確定 (reviewed_at が初めて設定) で受講者へ review_completed 通知を生成する。
 *
 * 返却形は旧 PostgREST 埋め込み (`profiles!student_id(...)`) に合わせ、
 * `profiles: { display_name, initials }` をネストしてフロントのマッパーを無変更に保つ。
 */

import { Hono } from "hono";
import { and, desc, eq, inArray } from "drizzle-orm";

import { notifications, profiles, submissions } from "../db/schema.js";
import { errorResponse, getCaller, requireRole, ApiError, isStaffRole } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const submissionsRoute = new Hono<{ Bindings: Env }>();

type SubmissionSelect = typeof submissions.$inferSelect;

/** DB 行 + 投稿者プロフィールを旧 PostgREST 形 (snake_case + profiles ネスト) に整える。 */
function toRow(
  s: SubmissionSelect,
  profile: { display_name: string; initials: string | null } | null,
) {
  return {
    id: s.id,
    tenant_id: s.tenantId,
    student_id: s.studentId,
    lesson_id: s.lessonId,
    assignment_id: s.assignmentId,
    course_title: s.courseTitle,
    section_title: s.sectionTitle,
    assignment_title: s.assignmentTitle,
    code: s.code,
    status: s.status,
    priority: s.priority,
    attempt: s.attempt,
    ai_ready: s.aiReady,
    ai_suggestions: s.aiSuggestions,
    rubric: s.rubric,
    review_notes: s.reviewNotes,
    verdict: s.verdict,
    submitted_at: s.submittedAt.toISOString(),
    profiles: profile,
  };
}

async function profileFor(
  db: Db,
  studentId: string | null,
): Promise<{ display_name: string; initials: string | null } | null> {
  if (!studentId) return null;
  const rows = await db
    .select({ display_name: profiles.displayName, initials: profiles.initials })
    .from(profiles)
    .where(eq(profiles.id, studentId))
    .limit(1);
  return rows[0] ?? null;
}

/** staff: テナント内の提出物一覧 (新着順)。 */
submissionsRoute.get("/api/submissions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.tenantId, caller.tenantId))
      .orderBy(desc(submissions.submittedAt));

    // 投稿者プロフィールを 1 クエリでまとめて引く (N+1 回避)。
    const studentIds = [...new Set(rows.map((r) => r.studentId).filter((x): x is string => !!x))];
    const profMap = new Map<string, { display_name: string; initials: string | null }>();
    if (studentIds.length > 0) {
      const profileRows = await db
        .select({ id: profiles.id, displayName: profiles.displayName, initials: profiles.initials })
        .from(profiles)
        .where(inArray(profiles.id, studentIds));
      for (const p of profileRows) {
        profMap.set(p.id, { display_name: p.displayName, initials: p.initials });
      }
    }
    return c.json({ rows: rows.map((r) => toRow(r, r.studentId ? profMap.get(r.studentId) ?? null : null)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 受講者: 自分の提出を作成する。 */
submissionsRoute.post("/api/submissions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as {
      lessonId?: string | null;
      assignmentId?: string | null;
      courseTitle: string;
      sectionTitle?: string | null;
      assignmentTitle: string;
      code: string;
      priority: "high" | "normal" | "low";
      attempt: number;
    };

    const inserted = await db
      .insert(submissions)
      .values({
        tenantId: caller.tenantId,
        studentId: caller.id,
        lessonId: body.lessonId ?? null,
        assignmentId: body.assignmentId ?? null,
        courseTitle: body.courseTitle,
        sectionTitle: body.sectionTitle ?? null,
        assignmentTitle: body.assignmentTitle,
        code: body.code,
        status: "pending",
        priority: body.priority,
        attempt: body.attempt,
      })
      .returning();
    const profile = { display_name: caller.name, initials: caller.name.slice(0, 2).toUpperCase() };
    return c.json({ row: toRow(inserted[0]!, profile) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 受講者: 自分の提出一覧 (新着順)。 */
submissionsRoute.get("/api/submissions/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.tenantId, caller.tenantId),
          eq(submissions.studentId, caller.id),
        ),
      )
      .orderBy(desc(submissions.submittedAt));

    const profile = await profileFor(db, caller.id);
    return c.json({
      rows: rows.map((r) => toRow(r, profile)),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 本人または staff: 提出物の詳細を取得。 */
submissionsRoute.get("/api/submissions/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const id = c.req.param("id");
    const rows = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    const row = rows[0];
    if (!row) throw new ApiError("対象の提出が見つかりません", 404);
    if (row.tenantId !== caller.tenantId) {
      throw new ApiError("他テナントの提出は操作できません", 403);
    }
    const isStaff = isStaffRole(caller.role);
    const isOwner = row.studentId === caller.id;
    if (!isStaff && !isOwner) {
      throw new ApiError("この提出を閲覧する権限がありません", 403);
    }
    return c.json({ row: toRow(row, await profileFor(db, row.studentId)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 提出物を更新 (添削)。 添削確定で受講者へ通知する。 */
submissionsRoute.patch("/api/submissions/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");

    const current = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    const before = current[0];
    if (!before) throw new ApiError("対象の提出が見つかりません", 404);
    if (before.tenantId !== caller.tenantId) {
      throw new ApiError("他テナントの提出は操作できません", 403);
    }

    const patch = (await c.req.json()) as {
      status?: "pending" | "passed" | "resubmit" | "failed";
      priority?: "high" | "normal" | "low";
      attempt?: number;
      aiReady?: boolean;
      aiSuggestions?: unknown[];
      rubric?: unknown[];
      reviewNotes?: string;
      verdict?: "pass" | "resubmit" | "fail" | null;
      code?: string;
    };

    const set: Partial<SubmissionSelect> = {};
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.priority !== undefined) set.priority = patch.priority;
    if (patch.attempt !== undefined) set.attempt = patch.attempt;
    if (patch.aiReady !== undefined) set.aiReady = patch.aiReady;
    if (patch.aiSuggestions !== undefined) set.aiSuggestions = patch.aiSuggestions;
    if (patch.rubric !== undefined) set.rubric = patch.rubric;
    if (patch.reviewNotes !== undefined) set.reviewNotes = patch.reviewNotes;
    if (patch.verdict !== undefined) set.verdict = patch.verdict;
    if (patch.code !== undefined) set.code = patch.code;

    // status が pending 以外になったら reviewed_at を打つ (旧 patchToUpdate 相当)。
    const willReview = patch.status !== undefined && patch.status !== "pending";
    if (willReview) {
      set.reviewedAt = new Date();
      set.reviewerId = caller.id;
    }

    if (Object.keys(set).length > 0) {
      await db.update(submissions).set(set).where(eq(submissions.id, id));
    }

    const after = (await db.select().from(submissions).where(eq(submissions.id, id)).limit(1))[0]!;

    // 添削確定の初回のみ通知 (旧 notify_review_completed: old.reviewed_at is null)。
    if (before.reviewedAt == null && after.reviewedAt != null && after.studentId) {
      const verdictBody =
        after.verdict === "pass"
          ? "合格しました。 おめでとうございます。"
          : after.verdict === "resubmit"
            ? "再提出が必要です。 フィードバックを確認してください。"
            : after.verdict === "fail"
              ? "残念ながら不合格です。 フィードバックを確認してください。"
              : "フィードバックが届いています。";
      await db.insert(notifications).values({
        userId: after.studentId,
        tenantId: after.tenantId,
        type: "review_completed",
        title: `${after.assignmentTitle || "課題"} の添削が完了しました`,
        body: verdictBody,
        payload: {
          submission_id: after.id,
          verdict: after.verdict,
          status: after.status,
          course_title: after.courseTitle,
        },
      });
    }

    return c.json({ row: toRow(after, await profileFor(db, after.studentId)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});
