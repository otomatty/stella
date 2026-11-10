/**
 * 分析ダッシュボード API (旧 get_tenant_analytics RPC / Issue #28)。
 *
 * 集計はサーバ側で行い、 admin / platform_admin のみ実行できる。 データは件数が
 * 限られるため、 取得後に JS で集計する (旧 SQL 集計と等価)。
 */

import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";

import {
  certificates,
  stages,
  enrollments,
  lessonProgress,
  profiles,
  quizAttempts,
  quizOptions,
  quizQuestions,
} from "../db/schema.js";
import { errorResponse, getCaller, requireAdmin } from "../lib/authz.js";
import { learnerOnly } from "../lib/learner-scope.js";
import type { Env } from "../env.js";
import type { QuizAnswer } from "@stella/shared/cms/types";

export const analyticsRoute = new Hono<{ Bindings: Env }>();

function round(n: number): number {
  return Math.round(n);
}

/** 管理者ダッシュボード用の KPI 一式。 */
analyticsRoute.get("/api/analytics/tenant", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireAdmin(caller);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 受講者数。
    const learners = await db
      .select({ id: profiles.id, disabled: profiles.disabled })
      .from(profiles)
      .where(eq(profiles.role, "student"));
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
      .where(learnerOnly(enrollments.userId));

    const enabledLearnerIds = new Set(learners.filter((l) => !l.disabled).map((l) => l.id));
    const activeLearners = new Set(
      enr
        .filter((e) => e.status === "active" && enabledLearnerIds.has(e.userId))
        .map((e) => e.userId),
    ).size;
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
      .where(and(eq(certificates.revoked, false), learnerOnly(certificates.userId)));
    const certsTotal = certs.length;
    const certsMonth = certs.filter((c) => c.issuedAt >= monthStart).length;

    // 平均学習時間 (時間)。
    const progress = await db
      .select({ userId: lessonProgress.userId, watchedSec: lessonProgress.watchedSec })
      .from(lessonProgress)
      .where(learnerOnly(lessonProgress.userId));
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
    const stageRows = await db.select({ id: stages.id, title: stages.title }).from(stages);
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
    const stumbles = await computeStumbles(db);

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
): Promise<Array<{ question_id: string; prompt: string; n: number; correct_pct: number }>> {
  // 全 attempt (quizId, answers)。
  const attempts = await db
    .select({ quizId: quizAttempts.quizId, answers: quizAttempts.answers })
    .from(quizAttempts)
    .where(learnerOnly(quizAttempts.userId));
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
