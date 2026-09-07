/**
 * 分析ダッシュボード API (旧 get_tenant_analytics / get_instructor_overview RPC / Issue #28)。
 *
 * 集計はサーバ側で行い、 同テナントの instructor/admin のみ実行できる。 越テナント参照は
 * caller.tenantId を母集合に使うことで構造的に遮断する。 データはテナント単位で件数が
 * 限られるため、 取得後に JS で集計する (旧 SQL 集計と等価)。
 */

import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";

import {
  certificates,
  stages,
  enrollments,
  lessonProgress,
  lessons,
  profiles,
  quizAttempts,
  quizOptions,
  quizQuestions,
  sections,
} from "../db/schema.js";
import { errorResponse, getCaller, requireRole } from "../lib/authz.js";
import type { Env } from "../env.js";
import type { QuizAnswer } from "@stella/shared/cms/types";

export const analyticsRoute = new Hono<{ Bindings: Env }>();

function round(n: number): number {
  return Math.round(n);
}

/** 管理者ダッシュボード用のテナント KPI 一式。 */
analyticsRoute.get("/api/analytics/tenant", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const tenantId = caller.tenantId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 受講者数。
    const learners = await db
      .select({ id: profiles.id, disabled: profiles.disabled })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.role, "student")));
    const totalLearners = learners.filter((l) => !l.disabled).length;

    // enrollment 一式。
    const enr = await db
      .select({
        id: enrollments.id,
        userId: enrollments.userId,
        stageId: enrollments.stageId,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .where(eq(enrollments.tenantId, tenantId));

    const activeLearners = new Set(enr.filter((e) => e.status === "active").map((e) => e.userId))
      .size;
    const totalEnroll = enr.length;
    const completedEnroll = enr.filter((e) => e.status === "completed").length;
    const expiredEnroll = enr.filter((e) => e.status === "expired").length;
    const activeEnroll = enr.filter((e) => e.status === "active").length;
    const newMonth = enr.filter((e) => e.enrolledAt >= monthStart).length;
    const newPrev = enr.filter(
      (e) => e.enrolledAt >= prevMonthStart && e.enrolledAt < monthStart,
    ).length;
    const completionRate = totalEnroll === 0 ? 0 : round((completedEnroll * 100) / totalEnroll);

    // 修了証 (revoked 除外)。
    const certs = await db
      .select({ issuedAt: certificates.issuedAt })
      .from(certificates)
      .where(and(eq(certificates.tenantId, tenantId), eq(certificates.revoked, false)));
    const certsTotal = certs.length;
    const certsMonth = certs.filter((c) => c.issuedAt >= monthStart).length;

    // 平均学習時間 (時間)。
    const progress = await db
      .select({ userId: lessonProgress.userId, watchedSec: lessonProgress.watchedSec })
      .from(lessonProgress)
      .where(eq(lessonProgress.tenantId, tenantId));
    const distinctUsers = new Set(progress.map((p) => p.userId)).size;
    const totalSec = progress.reduce((s, p) => s + (p.watchedSec ?? 0), 0);
    const avgStudyHours =
      distinctUsers === 0 ? 0 : Math.round((totalSec / distinctUsers / 3600) * 10) / 10;

    // 直近 12 ヶ月の月次新規登録 (空月は 0)。
    const trend: Array<{ month: string; label: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = enr.filter((e) => e.enrolledAt >= m && e.enrolledAt < next).length;
      const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      trend.push({ month: ym, label: `${m.getMonth() + 1}月`, count });
    }

    // ステージ別の登録者数と完了率。
    const stageRows = await db
      .select({ id: stages.id, title: stages.title })
      .from(stages)
      .where(eq(stages.tenantId, tenantId));
    const completionByStage = stageRows
      .map((co) => {
        const rows = enr.filter((e) => e.stageId === co.id);
        const n = rows.length;
        const done = rows.filter((e) => e.status === "completed").length;
        return { stage_id: co.id, name: co.title, n, pct: n === 0 ? 0 : round((done * 100) / n) };
      })
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

    // 小テストのつまずき分析 (正答率の低い順、 最大 8)。
    const stumbles = await computeStumbles(db, tenantId);

    return c.json({
      analytics: {
        active_learners: activeLearners,
        total_learners: totalLearners,
        completion_rate: completionRate,
        certs_this_month: certsMonth,
        certs_total: certsTotal,
        avg_study_hours: avgStudyHours,
        new_enrollments_this_month: newMonth,
        new_enrollments_prev_month: newPrev,
        enrollment_trend: trend,
        completion_by_stage: completionByStage,
        stumbles,
        status_breakdown: {
          active: activeEnroll,
          completed: completedEnroll,
          expired: expiredEnroll,
        },
        generated_at: now.toISOString(),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 設問ごとの正答率を attempt から算出し、 低い順に最大 8 件返す。 */
async function computeStumbles(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
): Promise<Array<{ question_id: string; prompt: string; n: number; correct_pct: number }>> {
  // テナントの全 attempt (quizId, answers)。
  const attempts = await db
    .select({ quizId: quizAttempts.quizId, answers: quizAttempts.answers })
    .from(quizAttempts)
    .where(eq(quizAttempts.tenantId, tenantId));
  if (attempts.length === 0) return [];

  const quizIds = [...new Set(attempts.map((a) => a.quizId))];
  if (quizIds.length === 0) return [];

  // 対象 quiz の設問 + 正解集合 (DB 側で quizIds / questionIds に絞り、 全表走査を避ける)。
  const questionsForQuizzes = await db
    .select({ id: quizQuestions.id, quizId: quizQuestions.quizId, prompt: quizQuestions.prompt })
    .from(quizQuestions)
    .where(inArray(quizQuestions.quizId, quizIds));
  const questionIds = questionsForQuizzes.map((q) => q.id);
  const correctRows =
    questionIds.length > 0
      ? await db
          .select({ questionId: quizOptions.questionId, id: quizOptions.id })
          .from(quizOptions)
          .where(and(eq(quizOptions.isCorrect, true), inArray(quizOptions.questionId, questionIds)))
      : [];
  const correctByQuestion = new Map<string, Set<string>>();
  for (const r of correctRows) {
    const set = correctByQuestion.get(r.questionId) ?? new Set<string>();
    set.add(r.id);
    correctByQuestion.set(r.questionId, set);
  }

  // 設問ごとに n / 正答数を集計。
  const stats = new Map<string, { prompt: string; n: number; correct: number }>();
  for (const q of questionsForQuizzes) stats.set(q.id, { prompt: q.prompt, n: 0, correct: 0 });

  for (const att of attempts) {
    const answers = (att.answers as QuizAnswer[]) ?? [];
    const selByQ = new Map<string, Set<string>>();
    for (const a of answers) selByQ.set(a.question_id, new Set(a.selected_option_ids ?? []));
    for (const q of questionsForQuizzes) {
      if (q.quizId !== att.quizId) continue;
      const st = stats.get(q.id);
      if (!st) continue;
      st.n += 1;
      const correct = correctByQuestion.get(q.id) ?? new Set<string>();
      const selected = selByQ.get(q.id) ?? new Set<string>();
      const ok = correct.size === selected.size && [...correct].every((id) => selected.has(id));
      if (ok) st.correct += 1;
    }
  }

  return [...stats.entries()]
    .filter(([, s]) => s.n >= 1)
    .map(([id, s]) => ({
      question_id: id,
      prompt: s.prompt,
      n: s.n,
      correct_pct: s.n === 0 ? 0 : round((s.correct * 100) / s.n),
    }))
    .sort((a, b) => a.correct_pct - b.correct_pct || b.n - a.n)
    .slice(0, 8);
}

/**
 * 講師ダッシュボード用の遅延 / 受講者進捗。
 *
 * 注: 講師 ↔ 受講者 / ステージの担当割当モデルは存在しないため、 母集合はテナント全体の
 * enrollment (= テナント概況) とする。 越テナント参照は caller.tenantId で構造的に遮断する。
 */
analyticsRoute.get("/api/analytics/instructor", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const tenantId = caller.tenantId;
    const now = new Date();

    const allEnr = await db
      .select({
        userId: enrollments.userId,
        stageId: enrollments.stageId,
        status: enrollments.status,
        dueAt: enrollments.dueAt,
      })
      .from(enrollments)
      .where(eq(enrollments.tenantId, tenantId));

    const overdue = allEnr.filter(
      (e) => e.status === "active" && e.dueAt != null && e.dueAt < now,
    ).length;
    const totalLearners = new Set(allEnr.map((e) => e.userId)).size;

    // 期限が近い順に active enrollment 上位 6 件の進捗サンプル。
    const active = allEnr
      .filter((e) => e.status === "active")
      .sort(
        (a, b) =>
          (a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY),
      )
      .slice(0, 6);

    // Neon HTTP は 1 クエリ = 1 ラウンドトリップのため、 受講者ごとのループ内クエリ (N+1)
    // を避け、 stage / lesson / progress / profile をまとめて取得してから JS で突合する。
    const sampleStageIds = [...new Set(active.map((e) => e.stageId))];
    const sampleUserIds = [...new Set(active.map((e) => e.userId))];

    const sampleStages =
      sampleStageIds.length > 0
        ? await db
            .select({ id: stages.id, title: stages.title })
            .from(stages)
            .where(and(eq(stages.tenantId, tenantId), inArray(stages.id, sampleStageIds)))
        : [];
    const stageTitleById = new Map(sampleStages.map((co) => [co.id, co.title]));

    // 対象ステージ配下の全レッスンを stageId ごとにグルーピング。
    const sampleLessons =
      sampleStageIds.length > 0
        ? await db
            .select({ lessonId: lessons.id, stageId: sections.stageId })
            .from(lessons)
            .innerJoin(sections, eq(sections.id, lessons.sectionId))
            .where(inArray(sections.stageId, sampleStageIds))
        : [];
    const lessonIdsByStage = new Map<string, string[]>();
    for (const r of sampleLessons) {
      const arr = lessonIdsByStage.get(r.stageId) ?? [];
      arr.push(r.lessonId);
      lessonIdsByStage.set(r.stageId, arr);
    }

    // 対象受講者の完了レッスンを userId ごとの集合に。
    const sampleCompleted =
      sampleUserIds.length > 0
        ? await db
            .select({ userId: lessonProgress.userId, lessonId: lessonProgress.lessonId })
            .from(lessonProgress)
            .where(
              and(
                eq(lessonProgress.tenantId, tenantId),
                inArray(lessonProgress.userId, sampleUserIds),
                eq(lessonProgress.completed, true),
              ),
            )
        : [];
    const completedByUser = new Map<string, Set<string>>();
    for (const r of sampleCompleted) {
      const set = completedByUser.get(r.userId) ?? new Set<string>();
      set.add(r.lessonId);
      completedByUser.set(r.userId, set);
    }

    // 対象受講者の表示名 / イニシャル。
    const sampleProfiles =
      sampleUserIds.length > 0
        ? await db
            .select({
              id: profiles.id,
              displayName: profiles.displayName,
              initials: profiles.initials,
            })
            .from(profiles)
            .where(and(eq(profiles.tenantId, tenantId), inArray(profiles.id, sampleUserIds)))
        : [];
    const profileById = new Map(sampleProfiles.map((p) => [p.id, p]));

    const students = active.map((e) => {
      const lessonIds = lessonIdsByStage.get(e.stageId) ?? [];
      const total = lessonIds.length;
      const completed = completedByUser.get(e.userId) ?? new Set<string>();
      const done = total === 0 ? 0 : lessonIds.filter((id) => completed.has(id)).length;
      const prof = profileById.get(e.userId);
      return {
        user_id: e.userId,
        display_name: prof?.displayName ?? "",
        initials: prof?.initials ?? null,
        stage_title: stageTitleById.get(e.stageId) ?? "",
        progress_pct: total === 0 ? 0 : round((done * 100) / total),
        overdue: e.dueAt != null && e.dueAt < now,
      };
    });

    return c.json({
      overview: {
        overdue_learners: overdue,
        total_learners: totalLearners,
        students,
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
