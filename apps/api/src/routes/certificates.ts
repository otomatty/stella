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
  stages,
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
import {
  errorResponse,
  getCaller,
  requireRole,
  ApiError,
  isStaffRole,
  requireReturning,
} from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { isCatalogAudience, learnerCanSeeGrantedStage } from "../lib/stage-audience.js";
import {
  autoCompleteEligibleStages,
  completionMet,
  genCertCode,
} from "../lib/stage-auto-complete.js";
import { recordStagePathEvents } from "../lib/stage-path-events.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";
import type { StageCompletion, GradebookEntry } from "@stella/shared/cms/types";

export const certificatesRoute = new Hono<{ Bindings: Env }>();

const CERT_COLS = {
  id: certificates.id,
  tenant_id: certificates.tenantId,
  user_id: certificates.userId,
  stage_id: certificates.stageId,
  cert_code: certificates.certCode,
  issued_by: certificates.issuedBy,
  issued_at: certificates.issuedAt,
  criteria_snapshot: certificates.criteriaSnapshot,
  recipient_name: certificates.recipientName,
  stage_title: certificates.stageTitle,
  tenant_name: certificates.tenantName,
  revoked: certificates.revoked,
} as const;

/**
 * (受講者, ステージ) の達成状況を集計する (旧 compute_course_completion)。
 * 認可: 本人 or 同テナント staff。 対象ユーザーが同テナントでなければ null。
 */
async function computeStageCompletion(
  db: Db,
  caller: Caller,
  userId: string,
  stageId: string,
): Promise<StageCompletion | null> {
  const stageRows = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
  const stage = stageRows[0];
  if (!stage || stage.tenantId !== caller.tenantId) return null;

  const isStaff = isStaffRole(caller.role);
  if (!(userId === caller.id || isStaff)) return null;

  // 受講者はカタログに無い専用星の題名・条件を UUID 直叩きで取れない。
  // staff の成績台帳 / 発行は従来どおりテナント内の全ステージを見る。
  if (!isStaff && !isCatalogAudience(stage.audience)) {
    const visible = await learnerCanSeeGrantedStage(db, caller.id, caller.tenantId, stageId);
    if (!visible) return null;
  }

  // 対象ユーザーが同テナントであることを必須化する。
  const target = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, userId), eq(profiles.tenantId, caller.tenantId)))
    .limit(1);
  if (!target[0]) return null;

  // ステージ配下のレッスン。
  const lessonRows = await db
    .select({ id: lessons.id, type: lessons.type })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.stageId, stageId));
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
    .where(eq(sections.stageId, stageId));
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

  const met = completionMet(stage, {
    totalLessons,
    completedLessons,
    totalQuizzes,
    passedQuizzes,
    totalAssignments,
    passedAssignments,
  });

  const certRows = await db
    .select({ certCode: certificates.certCode })
    .from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.stageId, stageId)))
    .limit(1);

  return {
    user_id: userId,
    stage_id: stageId,
    stage_title: stage.title,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    total_quizzes: totalQuizzes,
    passed_quizzes: passedQuizzes,
    total_assignments: totalAssignments,
    passed_assignments: passedAssignments,
    criteria: {
      require_all_lessons: stage.requireAllLessons,
      require_quiz_pass: stage.requireQuizPass,
      require_assignment_pass: stage.requireAssignmentPass,
      auto_issue_certificate: stage.autoIssueCertificate,
    },
    met,
    has_certificate: certRows.length > 0,
    cert_code: certRows[0]?.certCode ?? null,
  };
}

/**
 * 複数受講者 × 1 ステージの達成状況を一定回数のクエリで一括集計する (gradebook 用 / N+1 回避)。
 * computeStageCompletion と同じ判定ロジックをメモリ上で適用する。 認可は呼び出し側 (staff) で担保。
 */
async function batchComputeCompletions(
  db: Db,
  stage: typeof stages.$inferSelect,
  userIds: string[],
): Promise<Map<string, StageCompletion>> {
  const result = new Map<string, StageCompletion>();
  if (userIds.length === 0) return result;
  const stageId = stage.id;

  const lessonRows = await db
    .select({ id: lessons.id, type: lessons.type })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.stageId, stageId));
  const lessonIds = lessonRows.map((l) => l.id);
  const assignmentLessonIds = lessonRows.filter((l) => l.type === "assignment").map((l) => l.id);
  const totalLessons = lessonRows.length;

  const quizRows = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.stageId, stageId));
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
    .where(and(eq(certificates.stageId, stageId), inArray(certificates.userId, userIds)));

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
  const doneByUser = setBy(
    progressRows,
    (r) => r.userId,
    (r) => r.lessonId,
  );
  const quizByUser = setBy(
    quizPassRows,
    (r) => r.userId,
    (r) => r.quizId,
  );
  const assignByUser = setBy(
    assignPassRows,
    (r) => r.userId,
    (r) => r.lessonId,
  );
  const certByUser = new Map<string, string>();
  for (const r of certRows) certByUser.set(r.userId, r.certCode);

  for (const userId of userIds) {
    const completedLessons = doneByUser.get(userId)?.size ?? 0;
    const passedQuizzes = quizByUser.get(userId)?.size ?? 0;
    const passedAssignments = assignByUser.get(userId)?.size ?? 0;
    const met = completionMet(stage, {
      totalLessons,
      completedLessons,
      totalQuizzes,
      passedQuizzes,
      totalAssignments,
      passedAssignments,
    });
    const certCode = certByUser.get(userId) ?? null;
    result.set(userId, {
      user_id: userId,
      stage_id: stageId,
      stage_title: stage.title,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      total_quizzes: totalQuizzes,
      passed_quizzes: passedQuizzes,
      total_assignments: totalAssignments,
      passed_assignments: passedAssignments,
      criteria: {
        require_all_lessons: stage.requireAllLessons,
        require_quiz_pass: stage.requireQuizPass,
        require_assignment_pass: stage.requireAssignmentPass,
        auto_issue_certificate: stage.autoIssueCertificate,
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
    // 条件達成済みなのに未発行のステージをここで埋める (自動発行の導入前に達成して
    // いた受講者の救済)。best-effort — 失敗しても一覧はそのまま返る。
    // 埋めたぶんは `cleared_stages` で返し、画面がクリアの通知と受講ステージ一覧の
    // 取り直しに使う — 黙って埋めると、並走して取得した一覧側だけが古いまま残る。
    const clearedStages = await autoCompleteEligibleStages(db, caller, caller.id, clientIp(c));
    const rows = await db
      .select(CERT_COLS)
      .from(certificates)
      .where(eq(certificates.userId, caller.id))
      .orderBy(desc(certificates.issuedAt));
    return c.json({ rows, cleared_stages: clearedStages });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 受講者本人の、 あるステージの達成状況。 */
certificatesRoute.get("/api/certificates/completion/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const completion = await computeStageCompletion(db, caller, caller.id, c.req.param("stageId"));
    return c.json({ completion });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff 向け: ステージの成績台帳 (受講者 × 達成状況)。 */
certificatesRoute.get("/api/certificates/gradebook/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const stageId = c.req.param("stageId");

    const stageRows = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    const stage = stageRows[0];
    if (!stage || stage.tenantId !== caller.tenantId) {
      throw new ApiError("ステージが見つかりません", 404);
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
      .where(and(eq(enrollments.stageId, stageId), eq(enrollments.tenantId, caller.tenantId)))
      .orderBy(profiles.displayName);

    // 受講者ごとに computeStageCompletion を呼ぶと N+1 になり Workers の subrequest
    // 上限を超え得るため、 全受講者分を一定回数のクエリで一括集計する。
    const completions = await batchComputeCompletions(
      db,
      stage,
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
        stage_id: stageId,
        stage_title: stage.title,
        criteria: {
          require_all_lessons: stage.requireAllLessons,
          require_quiz_pass: stage.requireQuizPass,
          require_assignment_pass: stage.requireAssignmentPass,
          auto_issue_certificate: stage.autoIssueCertificate,
        },
        rows,
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 修了証を発行する (基準達成が前提・べき等)。**staff 専用。**
 *
 * 受講者の手動発行 (`auto_issue_certificate` ステージの本人発行) は廃止した — 条件を
 * 満たした時点でサーバが自動発行する (`lib/stage-auto-complete.ts`)。ここに残るのは
 * 講師承認ステージの発行と、Gradebook からの手動発行だけ。
 */
certificatesRoute.post("/api/certificates/issue", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const body = (await c.req.json()) as { stageId: string; userId: string };
    const { stageId, userId } = body;
    if (!stageId || !userId) throw new ApiError("stageId / userId が必要です", 400);

    const stageRows = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    const stage = stageRows[0];
    if (!stage || stage.tenantId !== caller.tenantId) {
      throw new ApiError("stage not found", 404);
    }
    // 対象が同テナントかつ当該ステージに受講登録済みであること。
    const enr = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.stageId, stageId),
          eq(enrollments.tenantId, caller.tenantId),
        ),
      )
      .limit(1);
    if (!enr[0]) throw new ApiError("user is not enrolled in this stage", 403);

    const completion = await computeStageCompletion(db, caller, userId, stageId);
    if (!completion) throw new ApiError("cannot evaluate completion", 400);
    if (!completion.met) throw new ApiError("completion criteria not met", 409);

    // 既発行ならべき等に返す。
    const existing = await db
      .select(CERT_COLS)
      .from(certificates)
      .where(and(eq(certificates.userId, userId), eq(certificates.stageId, stageId)))
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
      .where(eq(tenants.id, stage.tenantId))
      .limit(1);

    const inserted = await db
      .insert(certificates)
      .values({
        tenantId: stage.tenantId,
        userId,
        stageId,
        certCode: genCertCode(),
        issuedBy: caller.id,
        criteriaSnapshot: completion as unknown as Record<string, unknown>,
        recipientName: recipientRows[0].name,
        stageTitle: stage.title,
        tenantName: tenantRows[0]?.name ?? stage.tenantId,
      })
      .onConflictDoNothing({ target: [certificates.userId, certificates.stageId] })
      .returning(CERT_COLS);

    if (!inserted[0]) {
      // 競合で既発行になっていた場合は既存を返す。
      const again = await db
        .select(CERT_COLS)
        .from(certificates)
        .where(and(eq(certificates.userId, userId), eq(certificates.stageId, stageId)))
        .limit(1);
      return c.json({
        certificate: {
          ...toIssued(requireReturning(again, "certificate lookup")),
          already_existed: true,
        },
      });
    }

    // enrollment を completed にする。
    await db
      .update(enrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(enrollments.userId, userId), eq(enrollments.stageId, stageId)));

    // 学習経路の統計 (「星が点いた」)。修了証は 1 人 1 ステージ 1 枚なので、ここを通るのは
    // 新規発行のときだけ (既発行は上で早期 return している)。
    await recordStagePathEvents(db, stage.tenantId, "cleared", [{ userId, stageId }]);

    // 新規発行時のみ記録する (べき等な再取得は操作ではない)。
    await recordAudit(db, caller, {
      action: "certificate_issue",
      targetType: "certificate",
      targetId: inserted[0].id,
      ip: clientIp(c),
      metadata: {
        cert_code: inserted[0].cert_code,
        stage_id: stageId,
        user_id: userId,
        auto_issued: false,
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
  stage_id: string;
  user_id: string;
  issued_at: Date;
  recipient_name: string;
  stage_title: string;
  tenant_name: string;
  revoked: boolean;
}) {
  return {
    id: row.id,
    cert_code: row.cert_code,
    stage_id: row.stage_id,
    user_id: row.user_id,
    issued_at: row.issued_at.toISOString(),
    recipient_name: row.recipient_name,
    stage_title: row.stage_title,
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
        stage_title: certificates.stageTitle,
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
        stage_title: cert.stage_title,
        tenant_name: cert.tenant_name,
        issued_at: cert.issued_at.toISOString(),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
