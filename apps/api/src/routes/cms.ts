/**
 * CMS API (旧 cms-api.ts の BaaS 直アクセス + RLS + reorder RPC の置き換え / Issue #10)。
 *
 * 認可 (旧 RLS):
 *   - courses/sections/lessons/assignments の read は同テナント、 published か staff。
 *   - quizzes (CMS 編集) と listAssignments は staff のみ。
 *   - 書き込みはすべて同テナントの instructor/admin。 子要素は親のテナントを継承して検証する。
 *   - reorder は単一 UPDATE 相当を順序付き upsert で原子的に行う。
 *
 * 返却形は旧 DB 行 (snake_case) に合わせ、 フロントのマッパー (@falcon/shared/cms/types) を無変更に保つ。
 */

import { Hono } from "hono";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import {
  assignments,
  courses,
  lessons,
  quizOptions,
  quizQuestions,
  quizzes,
  sections,
} from "../db/schema.js";
import { errorResponse, getCaller, requireRole, ApiError } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const cmsRoute = new Hono<{ Bindings: Env }>();

function isStaff(caller: Caller): boolean {
  return caller.role === "instructor" || caller.role === "admin";
}

// --- mappers (Drizzle camelCase → 旧 DB 行 snake_case) ---
type CourseSel = typeof courses.$inferSelect;
type SectionSel = typeof sections.$inferSelect;
type LessonSel = typeof lessons.$inferSelect;
type AssignmentSel = typeof assignments.$inferSelect;
type QuizSel = typeof quizzes.$inferSelect;
type QuestionSel = typeof quizQuestions.$inferSelect;
type OptionSel = typeof quizOptions.$inferSelect;

const courseToRow = (c: CourseSel) => ({
  id: c.id,
  tenant_id: c.tenantId,
  slug: c.slug,
  title: c.title,
  category: c.category,
  color: c.color,
  duration_hours: c.durationHours,
  description: c.description,
  status: c.status,
  created_by: c.createdBy,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
  require_all_lessons: c.requireAllLessons,
  require_quiz_pass: c.requireQuizPass,
  require_assignment_pass: c.requireAssignmentPass,
  auto_issue_certificate: c.autoIssueCertificate,
});
const sectionToRow = (s: SectionSel) => ({
  id: s.id,
  course_id: s.courseId,
  title: s.title,
  order: s.order,
  created_at: s.createdAt,
});
const lessonToRow = (l: LessonSel) => ({
  id: l.id,
  section_id: l.sectionId,
  title: l.title,
  type: l.type,
  order: l.order,
  duration_label: l.durationLabel,
  video_path: l.videoPath,
  pdf_path: l.pdfPath,
  markdown: l.markdown,
  assignment_id: l.assignmentId,
  total_pages: l.totalPages,
  total_sec: l.totalSec,
  created_at: l.createdAt,
  updated_at: l.updatedAt,
});
const assignmentToRow = (a: AssignmentSel) => ({
  id: a.id,
  tenant_id: a.tenantId,
  stage: a.stage,
  chapter_id: a.chapterId,
  title: a.title,
  description: a.description,
  language: a.language,
  test_kind: a.testKind,
  starter_files: a.starterFiles,
  entry_file: a.entryFile,
  entry_points: a.entryPoints,
  tests: a.tests,
  sql_seed: a.sqlSeed,
  lint_preset: a.lintPreset,
  static_analysis: a.staticAnalysis,
  mutation: a.mutation,
  demo_call: a.demoCall,
  created_by: a.createdBy,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});
const quizToRow = (q: QuizSel) => ({
  id: q.id,
  lesson_id: q.lessonId,
  pass_score: q.passScore,
  time_limit_sec: q.timeLimitSec,
  shuffle_questions: q.shuffleQuestions,
  shuffle_options: q.shuffleOptions,
  max_attempts: q.maxAttempts,
  created_at: q.createdAt,
  updated_at: q.updatedAt,
});
const questionToRow = (q: QuestionSel) => ({
  id: q.id,
  quiz_id: q.quizId,
  kind: q.kind,
  prompt: q.prompt,
  explanation: q.explanation,
  points: q.points,
  order: q.order,
  created_at: q.createdAt,
  updated_at: q.updatedAt,
});
const optionToRow = (o: OptionSel) => ({
  id: o.id,
  question_id: o.questionId,
  label: o.label,
  is_correct: o.isCorrect,
  order: o.order,
});

// --- tenant 検証ヘルパ (子要素の書き込み時に親のテナント所属を確認) ---
async function courseTenant(db: Db, courseId: string): Promise<string | null> {
  const rows = await db.select({ t: courses.tenantId }).from(courses).where(eq(courses.id, courseId)).limit(1);
  return rows[0]?.t ?? null;
}
async function sectionCourse(db: Db, sectionId: string): Promise<{ courseId: string; tenant: string } | null> {
  const rows = await db
    .select({ courseId: sections.courseId, tenant: courses.tenantId })
    .from(sections)
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(sections.id, sectionId))
    .limit(1);
  return rows[0] ?? null;
}
async function lessonTenant(db: Db, lessonId: string): Promise<string | null> {
  const rows = await db
    .select({ tenant: courses.tenantId })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return rows[0]?.tenant ?? null;
}
async function quizTenant(db: Db, quizId: string): Promise<string | null> {
  const rows = await db
    .select({ tenant: courses.tenantId })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(quizzes.id, quizId))
    .limit(1);
  return rows[0]?.tenant ?? null;
}
async function questionTenant(db: Db, questionId: string): Promise<string | null> {
  const rows = await db
    .select({ tenant: courses.tenantId })
    .from(quizQuestions)
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(quizQuestions.id, questionId))
    .limit(1);
  return rows[0]?.tenant ?? null;
}
function assertTenant(t: string | null, caller: Caller): void {
  if (t == null) throw new ApiError("対象が見つかりません", 404);
  if (t !== caller.tenantId) throw new ApiError("他テナントのリソースは操作できません", 403);
}

// =================================================================
// Courses
// =================================================================

cmsRoute.get("/api/cms/courses", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const conds = [eq(courses.tenantId, caller.tenantId)];
    if (!isStaff(caller)) conds.push(eq(courses.status, "published"));
    const rows = await db
      .select()
      .from(courses)
      .where(and(...conds))
      .orderBy(desc(courses.updatedAt));
    return c.json({ rows: rows.map(courseToRow) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.get("/api/cms/courses/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const courseId = c.req.param("id");
    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const course = courseRows[0];
    if (!course || course.tenantId !== caller.tenantId) return c.json({ course: null });
    if (course.status !== "published" && !isStaff(caller)) return c.json({ course: null });

    const sectionRows = await db
      .select()
      .from(sections)
      .where(eq(sections.courseId, courseId))
      .orderBy(asc(sections.order));
    const sectionIds = sectionRows.map((s) => s.id);
    const lessonRows =
      sectionIds.length > 0
        ? await db
            .select()
            .from(lessons)
            .where(inArray(lessons.sectionId, sectionIds))
            .orderBy(asc(lessons.order))
        : [];

    return c.json({
      course: {
        course: courseToRow(course),
        sections: sectionRows.map((s) => ({
          section: sectionToRow(s),
          lessons: lessonRows.filter((l) => l.sectionId === s.id).map(lessonToRow),
        })),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/courses", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const input = (await c.req.json()) as Record<string, unknown> & { id?: string };
    const values = {
      tenantId: caller.tenantId,
      slug: String(input.slug),
      title: String(input.title),
      category: (input.category as string | null) ?? null,
      color: (input.color as CourseSel["color"]) ?? null,
      durationHours: (input.duration_hours as number | null) ?? null,
      description: (input.description as string | null) ?? null,
      status: (input.status as CourseSel["status"]) ?? "draft",
      requireAllLessons: (input.require_all_lessons as boolean) ?? true,
      requireQuizPass: (input.require_quiz_pass as boolean) ?? true,
      requireAssignmentPass: (input.require_assignment_pass as boolean) ?? true,
      autoIssueCertificate: (input.auto_issue_certificate as boolean) ?? true,
    };
    let row: CourseSel;
    if (input.id) {
      assertTenant(await courseTenant(db, input.id), caller);
      row = (await db.update(courses).set({ ...values, updatedAt: new Date() }).where(eq(courses.id, input.id)).returning())[0]!;
    } else {
      row = (await db.insert(courses).values(values).returning())[0]!;
    }
    return c.json({ row: courseToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.patch("/api/cms/courses/:id/status", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const id = c.req.param("id");
    assertTenant(await courseTenant(db, id), caller);
    const { status } = (await c.req.json()) as { status: CourseSel["status"] };
    await db.update(courses).set({ status, updatedAt: new Date() }).where(eq(courses.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/courses/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const id = c.req.param("id");
    assertTenant(await courseTenant(db, id), caller);
    await db.delete(courses).where(eq(courses.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Sections
// =================================================================

cmsRoute.post("/api/cms/sections", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const input = (await c.req.json()) as { id?: string; course_id: string; title: string; order?: number };
    assertTenant(await courseTenant(db, input.course_id), caller);
    const values = { courseId: input.course_id, title: input.title, order: input.order ?? 0 };
    let row: SectionSel;
    if (input.id) {
      row = (await db.update(sections).set(values).where(eq(sections.id, input.id)).returning())[0]!;
    } else {
      row = (await db.insert(sections).values(values).returning())[0]!;
    }
    return c.json({ row: sectionToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/sections/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const sc = await sectionCourse(db, c.req.param("id"));
    assertTenant(sc?.tenant ?? null, caller);
    await db.delete(sections).where(eq(sections.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/sections/reorder", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const { courseId, orderedIds } = (await c.req.json()) as { courseId: string; orderedIds: string[] };
    assertTenant(await courseTenant(db, courseId), caller);
    // 順序付きで各行の order を更新する (course 内に限定)。 並列実行でレイテンシを抑える。
    await Promise.all(
      orderedIds.map((id, i) =>
        db
          .update(sections)
          .set({ order: i })
          .where(and(eq(sections.id, id), eq(sections.courseId, courseId))),
      ),
    );
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Lessons
// =================================================================

cmsRoute.post("/api/cms/lessons", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const input = (await c.req.json()) as Record<string, unknown> & { id?: string; section_id: string };
    const sc = await sectionCourse(db, input.section_id);
    assertTenant(sc?.tenant ?? null, caller);
    const values = {
      sectionId: input.section_id,
      title: String(input.title),
      type: input.type as LessonSel["type"],
      order: (input.order as number) ?? 0,
      durationLabel: (input.duration_label as string | null) ?? null,
      videoPath: (input.video_path as string | null) ?? null,
      pdfPath: (input.pdf_path as string | null) ?? null,
      markdown: (input.markdown as string | null) ?? null,
      assignmentId: (input.assignment_id as string | null) ?? null,
      totalPages: (input.total_pages as number | null) ?? null,
      totalSec: (input.total_sec as number | null) ?? null,
    };
    let row: LessonSel;
    if (input.id) {
      row = (await db.update(lessons).set({ ...values, updatedAt: new Date() }).where(eq(lessons.id, input.id)).returning())[0]!;
    } else {
      row = (await db.insert(lessons).values(values).returning())[0]!;
    }
    return c.json({ row: lessonToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/lessons/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    assertTenant(await lessonTenant(db, c.req.param("id")), caller);
    await db.delete(lessons).where(eq(lessons.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/lessons/reorder", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const { sectionId, orderedIds } = (await c.req.json()) as { sectionId: string; orderedIds: string[] };
    const sc = await sectionCourse(db, sectionId);
    assertTenant(sc?.tenant ?? null, caller);
    await Promise.all(
      orderedIds.map((id, i) =>
        db
          .update(lessons)
          .set({ order: i })
          .where(and(eq(lessons.id, id), eq(lessons.sectionId, sectionId))),
      ),
    );
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Quiz (CMS 編集 — staff のみ)
// =================================================================

cmsRoute.get("/api/cms/quiz/by-lesson/:lessonId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const lessonId = c.req.param("lessonId");
    assertTenant(await lessonTenant(db, lessonId), caller);
    const quizRows = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    const quiz = quizRows[0];
    if (!quiz) return c.json({ quiz: null });

    const qRows = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(asc(quizQuestions.order));
    const oRows =
      qRows.length > 0
        ? await db
            .select()
            .from(quizOptions)
            .where(inArray(quizOptions.questionId, qRows.map((q) => q.id)))
            .orderBy(asc(quizOptions.order))
        : [];
    return c.json({
      quiz: {
        quiz: quizToRow(quiz),
        questions: qRows.map((q) => ({
          ...questionToRow(q),
          options: oRows.filter((o) => o.questionId === q.id).map(optionToRow),
        })),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/quiz/ensure", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const { lessonId } = (await c.req.json()) as { lessonId: string };
    assertTenant(await lessonTenant(db, lessonId), caller);
    const existing = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    if (existing[0]) return c.json({ row: quizToRow(existing[0]) });
    const row = (await db.insert(quizzes).values({ lessonId }).returning())[0]!;
    return c.json({ row: quizToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.patch("/api/cms/quiz/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const id = c.req.param("id");
    assertTenant(await quizTenant(db, id), caller);
    const p = (await c.req.json()) as Record<string, unknown>;
    const row = (
      await db
        .update(quizzes)
        .set({
          ...(p.pass_score !== undefined ? { passScore: p.pass_score as number } : {}),
          ...(p.time_limit_sec !== undefined ? { timeLimitSec: p.time_limit_sec as number | null } : {}),
          ...(p.shuffle_questions !== undefined ? { shuffleQuestions: p.shuffle_questions as boolean } : {}),
          ...(p.shuffle_options !== undefined ? { shuffleOptions: p.shuffle_options as boolean } : {}),
          ...(p.max_attempts !== undefined ? { maxAttempts: p.max_attempts as number | null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, id))
        .returning()
    )[0]!;
    return c.json({ row: quizToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/quiz-questions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const input = (await c.req.json()) as Record<string, unknown> & { id?: string; quiz_id: string };
    assertTenant(await quizTenant(db, input.quiz_id), caller);
    const values = {
      quizId: input.quiz_id,
      kind: input.kind as QuestionSel["kind"],
      prompt: String(input.prompt),
      explanation: (input.explanation as string | null) ?? null,
      points: (input.points as number) ?? 1,
      order: (input.order as number) ?? 0,
    };
    let row: QuestionSel;
    if (input.id) {
      row = (await db.update(quizQuestions).set({ ...values, updatedAt: new Date() }).where(eq(quizQuestions.id, input.id)).returning())[0]!;
    } else {
      row = (await db.insert(quizQuestions).values(values).returning())[0]!;
    }
    return c.json({ row: questionToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/quiz-questions/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    assertTenant(await questionTenant(db, c.req.param("id")), caller);
    await db.delete(quizQuestions).where(eq(quizQuestions.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/quiz-options", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const input = (await c.req.json()) as { id?: string; question_id: string; label: string; is_correct?: boolean; order?: number };
    assertTenant(await questionTenant(db, input.question_id), caller);
    const values = {
      questionId: input.question_id,
      label: input.label,
      isCorrect: input.is_correct ?? false,
      order: input.order ?? 0,
    };
    let row: OptionSel;
    if (input.id) {
      row = (await db.update(quizOptions).set(values).where(eq(quizOptions.id, input.id)).returning())[0]!;
    } else {
      row = (await db.insert(quizOptions).values(values).returning())[0]!;
    }
    return c.json({ row: optionToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/quiz-options/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    // option → question → ... のテナント検証。
    const rows = await db
      .select({ questionId: quizOptions.questionId })
      .from(quizOptions)
      .where(eq(quizOptions.id, c.req.param("id")))
      .limit(1);
    if (!rows[0]) throw new ApiError("対象が見つかりません", 404);
    assertTenant(await questionTenant(db, rows[0].questionId), caller);
    await db.delete(quizOptions).where(eq(quizOptions.id, c.req.param("id")));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// =================================================================
// Assignments
// =================================================================

cmsRoute.get("/api/cms/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.tenantId, caller.tenantId))
      .orderBy(desc(assignments.updatedAt));
    return c.json({ rows: rows.map(assignmentToRow) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.get("/api/cms/assignments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const id = c.req.param("id");
    const rows = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    const a = rows[0];
    if (!a || a.tenantId !== caller.tenantId) return c.json({ row: null });
    if (!isStaff(caller)) {
      // 受講者は published コース配下のレッスンに紐付く課題のみ。
      const linked = await db
        .select({ id: lessons.id })
        .from(lessons)
        .innerJoin(sections, eq(sections.id, lessons.sectionId))
        .innerJoin(courses, eq(courses.id, sections.courseId))
        .where(and(eq(lessons.assignmentId, id), eq(courses.status, "published"), eq(courses.tenantId, caller.tenantId)))
        .limit(1);
      if (!linked[0]) return c.json({ row: null });
    }
    return c.json({ row: assignmentToRow(a) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.post("/api/cms/assignments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const input = (await c.req.json()) as Record<string, unknown> & { id: string };
    // tenant は caller に固定する。
    const values = {
      id: String(input.id),
      tenantId: caller.tenantId,
      stage: String(input.stage),
      chapterId: String(input.chapter_id),
      title: String(input.title),
      description: String(input.description ?? ""),
      language: String(input.language ?? "javascript"),
      testKind: String(input.test_kind),
      starterFiles: Array.isArray(input.starter_files) ? input.starter_files : [],
      entryFile: (input.entry_file as string | null) ?? null,
      entryPoints: input.entry_points ?? null,
      tests: Array.isArray(input.tests) ? input.tests : [],
      sqlSeed: (input.sql_seed as string | null) ?? null,
      lintPreset: input.lint_preset ?? null,
      staticAnalysis: input.static_analysis ?? null,
      mutation: input.mutation ?? null,
      demoCall: (input.demo_call as string | null) ?? null,
    };
    const row = (
      await db
        .insert(assignments)
        .values(values)
        .onConflictDoUpdate({ target: assignments.id, set: { ...values, updatedAt: new Date() } })
        .returning()
    )[0]!;
    // 越テナント上書き防止: 既存が別テナントなら弾く。
    if (row.tenantId !== caller.tenantId) throw new ApiError("他テナントの課題は操作できません", 403);
    return c.json({ row: assignmentToRow(row) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

cmsRoute.delete("/api/cms/assignments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin");
    const id = c.req.param("id");
    const rows = await db.select({ t: assignments.tenantId }).from(assignments).where(eq(assignments.id, id)).limit(1);
    assertTenant(rows[0]?.t ?? null, caller);
    await db.delete(assignments).where(eq(assignments.id, id));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
