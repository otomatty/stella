/**
 * 修了判定 / 成績台帳 / 修了証 API
 * (旧 compute_course_completion / get_my_course_completion / get_course_gradebook /
 *  issue_certificate / verify_certificate RPC + certificates RLS の置き換え / Issue #26)。
 *
 * 採点・判定はすべてサーバ側で行い、 クライアントはスコアや判定を改竄できない。
 * verify は匿名実行可 (cert_code から公開情報のみ返す)。
 */

import { Hono } from "hono";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "../db/client.js";
import {
  certificates,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  profiles,
  quizAttempts,
  quizzes,
  sections,
  submissions,
  tenants,
} from "../db/schema.js";
import { errorResponse, getCaller, requireRole, ApiError, isStaffRole } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";
import type {
  CourseCompletion,
  GradebookEntry,
} from "@falcon/shared/cms/types";

export const certificatesRoute = new Hono<{ Bindings: Env }>();

const CERT_COLS = {
  id: certificates.id,
  tenant_id: certificates.tenantId,
  user_id: certificates.userId,
  course_id: certificates.courseId,
  cert_code: certificates.certCode,
  issued_by: certificates.issuedBy,
  issued_at: certificates.issuedAt,
  criteria_snapshot: certificates.criteriaSnapshot,
  recipient_name: certificates.recipientName,
  course_title: certificates.courseTitle,
  tenant_name: certificates.tenantName,
  revoked: certificates.revoked,
} as const;

/**
 * (受講者, コース) の達成状況を集計する (旧 compute_course_completion)。
 * 認可: 本人 or 同テナント staff。 対象ユーザーが同テナントでなければ null。
 */
async function computeCourseCompletion(
  db: Db,
  caller: Caller,
  userId: string,
  courseId: string,
): Promise<CourseCompletion | null> {
  const courseRows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  const course = courseRows[0];
  if (!course || course.tenantId !== caller.tenantId) return null;

  const isStaff = isStaffRole(caller.role);
  if (!(userId === caller.id || isStaff)) return null;

  // 対象ユーザーが同テナントであることを必須化する。
  const target = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, userId), eq(profiles.tenantId, caller.tenantId)))
    .limit(1);
  if (!target[0]) return null;

  // コース配下のレッスン。
  const lessonRows = await db
    .select({ id: lessons.id, type: lessons.type })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.courseId, courseId));
  const lessonIds = lessonRows.map((l) => l.id);
  const totalLessons = lessonRows.length;

  // 完了レッスン数 (lesson_progress.completed)。
  let completedLessons = 0;
  if (lessonIds.length > 0) {
    const done = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.completed, true),
          inArray(lessonProgress.lessonId, lessonIds),
        ),
      );
    completedLessons = new Set(done.map((d) => d.lessonId)).size;
  }

  // 小テスト総数 + 合格数。
  const quizRows = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.courseId, courseId));
  const quizIds = quizRows.map((q) => q.id);
  const totalQuizzes = quizIds.length;
  let passedQuizzes = 0;
  if (quizIds.length > 0) {
    const passed = await db
      .select({ quizId: quizAttempts.quizId })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.passed, true),
          inArray(quizAttempts.quizId, quizIds),
        ),
      );
    passedQuizzes = new Set(passed.map((p) => p.quizId)).size;
  }

  // 課題 (assignment レッスン) 総数 + pass 数。
  const assignmentLessonIds = lessonRows.filter((l) => l.type === "assignment").map((l) => l.id);
  const totalAssignments = assignmentLessonIds.length;
  let passedAssignments = 0;
  if (assignmentLessonIds.length > 0) {
    const passed = await db
      .select({ lessonId: submissions.lessonId })
      .from(submissions)
      .where(
        and(
          eq(submissions.studentId, userId),
          eq(submissions.verdict, "pass"),
          inArray(submissions.lessonId, assignmentLessonIds),
        ),
      );
    passedAssignments = new Set(passed.map((s) => s.lessonId)).size;
  }

  const met =
    totalLessons > 0 &&
    (!course.requireAllLessons || completedLessons >= totalLessons) &&
    (!course.requireQuizPass || passedQuizzes >= totalQuizzes) &&
    (!course.requireAssignmentPass || passedAssignments >= totalAssignments);

  const certRows = await db
    .select({ certCode: certificates.certCode })
    .from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
    .limit(1);

  return {
    user_id: userId,
    course_id: courseId,
    course_title: course.title,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    total_quizzes: totalQuizzes,
    passed_quizzes: passedQuizzes,
    total_assignments: totalAssignments,
    passed_assignments: passedAssignments,
    criteria: {
      require_all_lessons: course.requireAllLessons,
      require_quiz_pass: course.requireQuizPass,
      require_assignment_pass: course.requireAssignmentPass,
      auto_issue_certificate: course.autoIssueCertificate,
    },
    met,
    has_certificate: certRows.length > 0,
    cert_code: certRows[0]?.certCode ?? null,
  };
}

/**
 * 複数受講者 × 1 コースの達成状況を一定回数のクエリで一括集計する (gradebook 用 / N+1 回避)。
 * computeCourseCompletion と同じ判定ロジックをメモリ上で適用する。 認可は呼び出し側 (staff) で担保。
 */
async function batchComputeCompletions(
  db: Db,
  course: typeof courses.$inferSelect,
  userIds: string[],
): Promise<Map<string, CourseCompletion>> {
  const result = new Map<string, CourseCompletion>();
  if (userIds.length === 0) return result;
  const courseId = course.id;

  const lessonRows = await db
    .select({ id: lessons.id, type: lessons.type })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.courseId, courseId));
  const lessonIds = lessonRows.map((l) => l.id);
  const assignmentLessonIds = lessonRows.filter((l) => l.type === "assignment").map((l) => l.id);
  const totalLessons = lessonRows.length;

  const quizRows = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.courseId, courseId));
  const quizIds = quizRows.map((q) => q.id);
  const totalQuizzes = quizIds.length;
  const totalAssignments = assignmentLessonIds.length;

  const progressRows =
    lessonIds.length > 0
      ? await db
          .select({ userId: lessonProgress.userId, lessonId: lessonProgress.lessonId })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.completed, true),
              inArray(lessonProgress.userId, userIds),
              inArray(lessonProgress.lessonId, lessonIds),
            ),
          )
      : [];
  const quizPassRows =
    quizIds.length > 0
      ? await db
          .select({ userId: quizAttempts.userId, quizId: quizAttempts.quizId })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.passed, true),
              inArray(quizAttempts.userId, userIds),
              inArray(quizAttempts.quizId, quizIds),
            ),
          )
      : [];
  const assignPassRows =
    assignmentLessonIds.length > 0
      ? await db
          .select({ userId: submissions.studentId, lessonId: submissions.lessonId })
          .from(submissions)
          .where(
            and(
              eq(submissions.verdict, "pass"),
              inArray(submissions.studentId, userIds),
              inArray(submissions.lessonId, assignmentLessonIds),
            ),
          )
      : [];
  const certRows = await db
    .select({ userId: certificates.userId, certCode: certificates.certCode })
    .from(certificates)
    .where(and(eq(certificates.courseId, courseId), inArray(certificates.userId, userIds)));

  const setBy = <T>(rows: T[], key: (r: T) => string | null, val: (r: T) => string | null) => {
    const m = new Map<string, Set<string>>();
    for (const r of rows) {
      const k = key(r);
      const v = val(r);
      if (!k || !v) continue;
      const s = m.get(k) ?? new Set<string>();
      s.add(v);
      m.set(k, s);
    }
    return m;
  };
  const doneByUser = setBy(progressRows, (r) => r.userId, (r) => r.lessonId);
  const quizByUser = setBy(quizPassRows, (r) => r.userId, (r) => r.quizId);
  const assignByUser = setBy(assignPassRows, (r) => r.userId, (r) => r.lessonId);
  const certByUser = new Map<string, string>();
  for (const r of certRows) certByUser.set(r.userId, r.certCode);

  for (const userId of userIds) {
    const completedLessons = doneByUser.get(userId)?.size ?? 0;
    const passedQuizzes = quizByUser.get(userId)?.size ?? 0;
    const passedAssignments = assignByUser.get(userId)?.size ?? 0;
    const met =
      totalLessons > 0 &&
      (!course.requireAllLessons || completedLessons >= totalLessons) &&
      (!course.requireQuizPass || passedQuizzes >= totalQuizzes) &&
      (!course.requireAssignmentPass || passedAssignments >= totalAssignments);
    const certCode = certByUser.get(userId) ?? null;
    result.set(userId, {
      user_id: userId,
      course_id: courseId,
      course_title: course.title,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      total_quizzes: totalQuizzes,
      passed_quizzes: passedQuizzes,
      total_assignments: totalAssignments,
      passed_assignments: passedAssignments,
      criteria: {
        require_all_lessons: course.requireAllLessons,
        require_quiz_pass: course.requireQuizPass,
        require_assignment_pass: course.requireAssignmentPass,
        auto_issue_certificate: course.autoIssueCertificate,
      },
      met,
      has_certificate: certCode != null,
      cert_code: certCode,
    });
  }
  return result;
}

/** 受講者本人の修了証一覧 (発行日降順)。 */
certificatesRoute.get("/api/certificates/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select(CERT_COLS)
      .from(certificates)
      .where(eq(certificates.userId, caller.id))
      .orderBy(desc(certificates.issuedAt));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 受講者本人の、 あるコースの達成状況。 */
certificatesRoute.get("/api/certificates/completion/:courseId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const completion = await computeCourseCompletion(
      db,
      caller,
      caller.id,
      c.req.param("courseId"),
    );
    return c.json({ completion });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff 向け: コースの成績台帳 (受講者 × 達成状況)。 */
certificatesRoute.get("/api/certificates/gradebook/:courseId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const courseId = c.req.param("courseId");

    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const course = courseRows[0];
    if (!course || course.tenantId !== caller.tenantId) {
      throw new ApiError("コースが見つかりません", 404);
    }

    const enrolled = await db
      .select({
        userId: enrollments.userId,
        displayName: profiles.displayName,
        initials: profiles.initials,
        email: profiles.email,
        status: enrollments.status,
        dueAt: enrollments.dueAt,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .innerJoin(profiles, eq(profiles.id, enrollments.userId))
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.tenantId, caller.tenantId)))
      .orderBy(profiles.displayName);

    // 受講者ごとに computeCourseCompletion を呼ぶと N+1 になり Workers の subrequest
    // 上限を超え得るため、 全受講者分を一定回数のクエリで一括集計する。
    const completions = await batchComputeCompletions(
      db,
      course,
      enrolled.map((e) => e.userId),
    );
    const rows: GradebookEntry[] = enrolled.map((e) => ({
      user_id: e.userId,
      display_name: e.displayName,
      initials: e.initials,
      email: e.email,
      enrollment_status: e.status,
      due_at: e.dueAt ? e.dueAt.toISOString() : null,
      enrolled_at: e.enrolledAt.toISOString(),
      completion: completions.get(e.userId) ?? null,
    }));

    return c.json({
      gradebook: {
        course_id: courseId,
        course_title: course.title,
        criteria: {
          require_all_lessons: course.requireAllLessons,
          require_quiz_pass: course.requireQuizPass,
          require_assignment_pass: course.requireAssignmentPass,
          auto_issue_certificate: course.autoIssueCertificate,
        },
        rows,
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** ランダムな cert_code を生成する (FLC-YYYY-XXXX-XXXX)。 */
function genCertCode(): string {
  const year = new Date().getFullYear();
  const seg = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return `FLC-${year}-${seg()}-${seg()}`;
}

/** 修了証を発行する (基準達成が前提・べき等)。 */
certificatesRoute.post("/api/certificates/issue", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as { courseId: string; userId: string };
    const { courseId, userId } = body;
    if (!courseId || !userId) throw new ApiError("courseId / userId が必要です", 400);

    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const course = courseRows[0];
    if (!course || course.tenantId !== caller.tenantId) {
      throw new ApiError("course not found", 404);
    }
    const isStaff = isStaffRole(caller.role);
    if (!(userId === caller.id || isStaff)) {
      throw new ApiError("not authorized to issue this certificate", 403);
    }
    // 自動発行を許可しないコースは本人発行を拒否 (講師承認のみ)。
    if (!isStaff && !course.autoIssueCertificate) {
      throw new ApiError("certificate requires instructor approval", 403);
    }
    // 対象が同テナントかつ当該コースに受講登録済みであること。
    const enr = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId),
          eq(enrollments.tenantId, caller.tenantId),
        ),
      )
      .limit(1);
    if (!enr[0]) throw new ApiError("user is not enrolled in this course", 403);

    const completion = await computeCourseCompletion(db, caller, userId, courseId);
    if (!completion) throw new ApiError("cannot evaluate completion", 400);
    if (!completion.met) throw new ApiError("completion criteria not met", 409);

    // 既発行ならべき等に返す。
    const existing = await db
      .select(CERT_COLS)
      .from(certificates)
      .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
      .limit(1);
    if (existing[0]) {
      return c.json({ certificate: { ...toIssued(existing[0]), already_existed: true } });
    }

    const recipientRows = await db
      .select({ name: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (!recipientRows[0]) throw new ApiError("recipient profile not found", 404);
    const tenantRows = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, course.tenantId))
      .limit(1);

    const inserted = await db
      .insert(certificates)
      .values({
        tenantId: course.tenantId,
        userId,
        courseId,
        certCode: genCertCode(),
        issuedBy: isStaff ? caller.id : null,
        criteriaSnapshot: completion as unknown as Record<string, unknown>,
        recipientName: recipientRows[0].name,
        courseTitle: course.title,
        tenantName: tenantRows[0]?.name ?? course.tenantId,
      })
      .onConflictDoNothing({ target: [certificates.userId, certificates.courseId] })
      .returning(CERT_COLS);

    if (!inserted[0]) {
      // 競合で既発行になっていた場合は既存を返す。
      const again = await db
        .select(CERT_COLS)
        .from(certificates)
        .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
        .limit(1);
      return c.json({ certificate: { ...toIssued(again[0]!), already_existed: true } });
    }

    // enrollment を completed にする。
    await db
      .update(enrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));

    // 新規発行時のみ記録する (べき等な再取得は操作ではない)。
    // 自己発行 (受講者本人 + auto_issue_certificate) もあるため actor は caller のまま。
    await recordAudit(db, caller, {
      action: "certificate_issue",
      targetType: "certificate",
      targetId: inserted[0].id,
      ip: clientIp(c),
      metadata: {
        cert_code: inserted[0].cert_code,
        course_id: courseId,
        user_id: userId,
        self_issued: !isStaff,
      },
    });

    return c.json({ certificate: { ...toIssued(inserted[0]), already_existed: false } });
  } catch (err) {
    return errorResponse(c, err);
  }
});

function toIssued(row: {
  id: string;
  cert_code: string;
  course_id: string;
  user_id: string;
  issued_at: Date;
  recipient_name: string;
  course_title: string;
  tenant_name: string;
  revoked: boolean;
}) {
  return {
    id: row.id,
    cert_code: row.cert_code,
    course_id: row.course_id,
    user_id: row.user_id,
    issued_at: row.issued_at.toISOString(),
    recipient_name: row.recipient_name,
    course_title: row.course_title,
    tenant_name: row.tenant_name,
    revoked: row.revoked,
  };
}

/** cert_code から真正性を検証する (匿名実行可)。 */
certificatesRoute.get("/api/certificates/verify/:certCode", async (c) => {
  try {
    const raw = c.req.param("certCode");
    const certCode = raw?.trim().toUpperCase();
    if (!certCode) return c.json({ verification: null });
    const db = getDb(c.env);
    const rows = await db
      .select({
        cert_code: certificates.certCode,
        recipient_name: certificates.recipientName,
        course_title: certificates.courseTitle,
        tenant_name: certificates.tenantName,
        issued_at: certificates.issuedAt,
        revoked: certificates.revoked,
      })
      .from(certificates)
      .where(eq(certificates.certCode, certCode))
      .limit(1);
    const cert = rows[0];
    if (!cert) {
      return c.json({ verification: { valid: false, reason: "not_found" } });
    }
    if (cert.revoked) {
      return c.json({
        verification: { valid: false, reason: "revoked", cert_code: cert.cert_code },
      });
    }
    return c.json({
      verification: {
        valid: true,
        cert_code: cert.cert_code,
        recipient_name: cert.recipient_name,
        course_title: cert.course_title,
        tenant_name: cert.tenant_name,
        issued_at: cert.issued_at.toISOString(),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
