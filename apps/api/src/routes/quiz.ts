/**
 * 受講者向け小テスト出題 / 採点 API (旧 get_quiz_for_lesson / submit_quiz_attempt RPC / Issue #23)。
 *
 * セキュリティ要件 (旧 security definer RPC と同じ):
 *   - 出題は is_correct / explanation を含めずサニタイズして返す (カンニング不可)。
 *   - 採点はサーバ側で行い、 受講者は score を改竄できない。
 *   - アクセス可否: ロールによらず published + active enrollment。
 *
 * この 2 本は受講者シェル (`QuizPlayer`) だけが叩く。 staff が編集で使うのは
 * `/api/cms/quiz/by-lesson/:lessonId` (staff 限定) なので、 ここに staff の
 * 抜け道は要らない。 staff が受講者として小テストを解くなら受講登録しておく。
 */

import { Hono } from "hono";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import {
  courses,
  enrollments,
  lessons,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  sections,
} from "../db/schema.js";
import { errorResponse, getCaller, ApiError } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";
import type { LearnerQuizHistory, QuizAnswer } from "@falcon/shared/cms/types";

export const quizRoute = new Hono<{ Bindings: Env }>();

/**
 * lesson が caller の同テナントで、かつアクセス可かを判定する。
 * ロールによらず published かつ当該コースに active enrollment があること。
 */
async function isAuthorizedForLesson(db: Db, caller: Caller, lessonId: string): Promise<boolean> {
  const rows = await db
    .select({
      status: courses.status,
      tenantId: courses.tenantId,
      courseId: courses.id,
    })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  const row = rows[0];
  if (!row) return false;
  if (row.tenantId !== caller.tenantId) return false;
  if (row.status !== "published") return false;

  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.courseId, row.courseId),
        eq(enrollments.status, "active"),
      ),
    )
    .limit(1);
  return enrolled.length > 0;
}

/**
 * 受講者自身の受験履歴を要約する。
 *
 * 出題と一緒に返して、 再訪時に「合格済み」を復元し、 受験回数の上限も判定できるようにする。
 * 正解は含めない (出題のサニタイズと同じ理由)。
 */
async function loadHistory(db: Db, quizId: string, userId: string): Promise<LearnerQuizHistory> {
  const rows = await db
    .select({
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      passed: quizAttempts.passed,
      submittedAt: quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId)))
    .orderBy(desc(quizAttempts.submittedAt));

  const last = rows[0];
  return {
    attempt_count: rows.length,
    passed: rows.some((r) => r.passed),
    last_score: last?.score ?? null,
    last_max_score: last?.maxScore ?? null,
    last_attempt_at: last ? new Date(last.submittedAt).toISOString() : null,
  };
}

/** 受講者向けの設問を取得する (サニタイズ済み)。 quiz 未作成 / 権限外なら null。 */
quizRoute.get("/api/quiz/for-lesson/:lessonId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const lessonId = c.req.param("lessonId");

    const quizRows = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    const quiz = quizRows[0];
    if (!quiz) return c.json({ quiz: null });

    if (!(await isAuthorizedForLesson(db, caller, lessonId))) {
      return c.json({ quiz: null });
    }

    const questionRows = await db
      .select({
        id: quizQuestions.id,
        kind: quizQuestions.kind,
        prompt: quizQuestions.prompt,
        points: quizQuestions.points,
        order: quizQuestions.order,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(asc(quizQuestions.order), asc(quizQuestions.id));

    const optionRows = await db
      .select({
        id: quizOptions.id,
        questionId: quizOptions.questionId,
        label: quizOptions.label,
        order: quizOptions.order,
      })
      .from(quizOptions)
      .innerJoin(quizQuestions, eq(quizQuestions.id, quizOptions.questionId))
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(asc(quizOptions.order), asc(quizOptions.id));

    const questions = questionRows.map((q) => ({
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      points: q.points,
      order: q.order,
      options: optionRows
        .filter((o) => o.questionId === q.id)
        .map((o) => ({ id: o.id, label: o.label, order: o.order })),
    }));

    return c.json({
      quiz: {
        quiz: {
          id: quiz.id,
          lesson_id: quiz.lessonId,
          pass_score: quiz.passScore,
          time_limit_sec: quiz.timeLimitSec,
          shuffle_questions: quiz.shuffleQuestions,
          shuffle_options: quiz.shuffleOptions,
          max_attempts: quiz.maxAttempts,
        },
        questions,
        history: await loadHistory(db, quiz.id, caller.id),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 回答を送信してサーバ採点する。 結果 (点数 / 合否 / 各問正誤 / 解説) を返す。 */
quizRoute.post("/api/quiz/:quizId/attempt", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const quizId = c.req.param("quizId");
    const body = (await c.req.json()) as { answers: QuizAnswer[] };
    const answers = Array.isArray(body.answers) ? body.answers : [];

    const quizRows = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    const quiz = quizRows[0];
    if (!quiz) throw new ApiError("quiz not found", 404);
    if (!(await isAuthorizedForLesson(db, caller, quiz.lessonId))) {
      throw new ApiError("not authorized for this quiz", 403);
    }

    // 設問 + 正解集合を取得して採点する。
    const questionRows = await db
      .select({
        id: quizQuestions.id,
        points: quizQuestions.points,
        explanation: quizQuestions.explanation,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.order), asc(quizQuestions.id));

    const correctRows = await db
      .select({ questionId: quizOptions.questionId, id: quizOptions.id })
      .from(quizOptions)
      .innerJoin(quizQuestions, eq(quizQuestions.id, quizOptions.questionId))
      .where(and(eq(quizQuestions.quizId, quizId), eq(quizOptions.isCorrect, true)));

    const correctByQuestion = new Map<string, Set<string>>();
    for (const r of correctRows) {
      const set = correctByQuestion.get(r.questionId) ?? new Set<string>();
      set.add(r.id);
      correctByQuestion.set(r.questionId, set);
    }
    const selectedByQuestion = new Map<string, Set<string>>();
    for (const a of answers) {
      selectedByQuestion.set(a.question_id, new Set(a.selected_option_ids ?? []));
    }

    let score = 0;
    let max = 0;
    const results = questionRows.map((q) => {
      max += q.points;
      const correct = correctByQuestion.get(q.id) ?? new Set<string>();
      const selected = selectedByQuestion.get(q.id) ?? new Set<string>();
      // 集合の完全一致 (順不同・重複無視)。
      const isCorrect =
        correct.size === selected.size && [...correct].every((id) => selected.has(id));
      if (isCorrect) score += q.points;
      return {
        question_id: q.id,
        correct: isCorrect,
        correct_option_ids: [...correct],
        explanation: q.explanation,
      };
    });

    const passed = max === 0 ? true : (score * 100) / max >= quiz.passScore;

    // 受験回数の上限 (null は無制限)。 UI 側の制御だけでは直接 POST を防げない。
    //
    // 「件数を数えてから INSERT」 に分けると、 同時に投げられた複数のリクエストが
    // どれも INSERT 前の件数を読んで全部通ってしまう。 1 文の INSERT ... SELECT に
    // 条件を畳み込み、 実際に挿入されたか (changes) で判定する。
    // 合格済みの再受験は上限に関係なく許す (成績は下がらない)。
    const inserted = await db.run(
      sql`insert into quiz_attempts (id, tenant_id, quiz_id, user_id, score, max_score, passed, answers, submitted_at)
          select ${crypto.randomUUID()}, ${caller.tenantId}, ${quizId}, ${caller.id}, ${score}, ${max}, ${passed ? 1 : 0}, ${JSON.stringify(answers)}, ${Date.now()}
          where ${quiz.maxAttempts} is null
             or (select count(*) from quiz_attempts where quiz_id = ${quizId} and user_id = ${caller.id}) < ${quiz.maxAttempts}
             or exists (select 1 from quiz_attempts where quiz_id = ${quizId} and user_id = ${caller.id} and passed = 1)`,
    );
    if (inserted.meta.changes === 0) {
      throw new ApiError("attempt limit reached", 429);
    }

    return c.json({ result: { score, max_score: max, passed, results } });
  } catch (err) {
    return errorResponse(c, err);
  }
});
