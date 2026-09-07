/**
 * デイリー復習 (SRS) API (docs/superpowers/specs/2026-08-20-daily-srs-review-design.md §4)。
 *
 * ルート名が `review` でないのは講師の課題添削 (review-draft / review-queue) と
 * 衝突するため。 受講者は自分のカードのみ参照でき、 出題は is_correct / explanation を
 * 含めない (quiz.ts と同じサニタイズ)。 復習は quiz_attempts に書かず、 quizzes.max_attempts
 * も消費しない。
 */

import { Hono } from "hono";
import { and, asc, count, eq, gt, gte, inArray, lt, lte, type SQL } from "drizzle-orm";
import { studyDateStartMs, toStudyDate } from "@stella/shared/study/activity";
import type { SrsTodaySummary } from "@stella/shared/srs/types";
import type { QuizAnswer } from "@stella/shared/cms/types";

import type { Env } from "../env.js";
import {
  stages,
  enrollments,
  lessons,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  reviewCards,
  reviewLogs,
  sections,
} from "../db/schema.js";
import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import { chunk } from "../lib/enrollment-bulk.js";
import { isExactSelection } from "../lib/quiz-grading.js";
import { applyOutcomesToCards } from "../lib/srs-cards.js";
import type { Db } from "../db/client.js";

export const srsRoute = new Hono<{ Bindings: Env }>();

/** 1 日の出題上限。 due がこれを超えたぶんは翌日以降に持ち越す。 */
const DAILY_MAX = 20;
/** 1 日の出題下限。 due が足りない日は期日の近いカードを前倒しして埋める。 */
const DAILY_MIN = 5;

/**
 * 受講者がアクセスできるカードを due の古い順に返す。
 * published なステージ + active な enrollment の設問に限定する (quiz.ts の
 * isAuthorizedForLesson と同じ条件を join で畳んだもの)。
 */
async function selectAccessibleCards(
  db: Db,
  caller: Caller,
  extra: SQL,
  limitN?: number,
): Promise<Array<{ questionId: string; dueDate: string }>> {
  const base = db
    .select({ questionId: reviewCards.questionId, dueDate: reviewCards.dueDate })
    .from(reviewCards)
    .innerJoin(quizQuestions, eq(quizQuestions.id, reviewCards.questionId))
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.stageId, stages.id),
        eq(enrollments.userId, caller.id),
        eq(enrollments.status, "active"),
      ),
    )
    .where(
      and(
        eq(reviewCards.userId, caller.id),
        eq(stages.tenantId, caller.tenantId),
        eq(stages.status, "published"),
        extra,
      ),
    )
    .orderBy(asc(reviewCards.dueDate), asc(reviewCards.id));
  return limitN !== undefined ? base.limit(limitN) : base;
}

/**
 * 過去のクイズ受験からカードを遅延生成する (機能リリース前からの利用者と、
 * クイズ側のカード反映が部分失敗したときのリカバリを兼ねる)。
 *
 * 各クイズの最新受験のうち、 **まだカード化されていない解答済み設問だけ** を埋める。
 * 「カードが 1 枚でもあれば全体をスキップ」にすると、 リリース後に先に新しいクイズを
 * 解いたユーザーの過去受験分が永久に欠落するため、 設問単位で差分を見る。
 * 当時の answers に無い設問 (受験後に追加された設問・未解答) はカード化しない。
 * 欠落が無ければ軽い 2 クエリで抜けるので毎回呼んでよい。
 */
async function backfillCards(db: Db, caller: Caller): Promise<void> {
  const attempts = await db
    .select({
      quizId: quizAttempts.quizId,
      answers: quizAttempts.answers,
      submittedAt: quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, caller.id), eq(quizAttempts.tenantId, caller.tenantId)))
    .orderBy(asc(quizAttempts.submittedAt));
  if (attempts.length === 0) return;

  const cardedRows = await db
    .select({ questionId: reviewCards.questionId })
    .from(reviewCards)
    .where(eq(reviewCards.userId, caller.id));
  const carded = new Set(cardedRows.map((r) => r.questionId));

  // 昇順に舐めて Map を上書きすると各クイズの最新受験だけ残る。
  const latestByQuiz = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) latestByQuiz.set(a.quizId, a);

  // 未カード化の解答を含むクイズだけを対象にする。
  const targetByQuiz = new Map<string, (typeof attempts)[number]>();
  for (const [quizId, attempt] of latestByQuiz) {
    const answers = (Array.isArray(attempt.answers) ? attempt.answers : []) as QuizAnswer[];
    if (answers.some((a) => !carded.has(a.question_id))) targetByQuiz.set(quizId, attempt);
  }
  if (targetByQuiz.size === 0) return;
  const quizIds = [...targetByQuiz.keys()];

  // D1 のバインド上限があるため、 quizIds を chunk してクエリを分ける
  // (100 以上のクイズを受験済みだと inArray 1 発では落ちる)。
  const questionRows: Array<{ id: string; quizId: string }> = [];
  const correctRows: Array<{ questionId: string; id: string }> = [];
  for (const idsChunk of chunk(quizIds, 50)) {
    questionRows.push(
      ...(await db
        .select({ id: quizQuestions.id, quizId: quizQuestions.quizId })
        .from(quizQuestions)
        .where(inArray(quizQuestions.quizId, idsChunk))),
    );
    correctRows.push(
      ...(await db
        .select({ questionId: quizOptions.questionId, id: quizOptions.id })
        .from(quizOptions)
        .innerJoin(quizQuestions, eq(quizQuestions.id, quizOptions.questionId))
        .where(and(inArray(quizQuestions.quizId, idsChunk), eq(quizOptions.isCorrect, true)))),
    );
  }
  const quizByQuestion = new Map(questionRows.map((q) => [q.id, q.quizId]));
  const correctByQuestion = new Map<string, Set<string>>();
  for (const r of correctRows) {
    const set = correctByQuestion.get(r.questionId) ?? new Set<string>();
    set.add(r.id);
    correctByQuestion.set(r.questionId, set);
  }

  for (const [quizId, attempt] of targetByQuiz) {
    const answers = (Array.isArray(attempt.answers) ? attempt.answers : []) as QuizAnswer[];
    const selectedByQuestion = new Map<string, Set<string>>();
    for (const a of answers) {
      selectedByQuestion.set(a.question_id, new Set(a.selected_option_ids ?? []));
    }
    // 解答済み・未カード化・現存する設問だけ。 削除済み設問の解答は捨てる。
    const outcomes = [...selectedByQuestion].flatMap(([questionId, sel]) => {
      if (carded.has(questionId)) return [];
      if (quizByQuestion.get(questionId) !== quizId) return [];
      return [
        {
          questionId,
          correct: isExactSelection(correctByQuestion.get(questionId) ?? new Set<string>(), sel),
        },
      ];
    });
    if (outcomes.length === 0) continue;
    await applyOutcomesToCards(db, caller.tenantId, caller.id, outcomes, attempt.submittedAt);
  }
}

/** 今日の復習キュー。 due 順に上限 20 − 今日の解答数、 足りなければ前倒しで最低 5 問。 */
srsRoute.get("/api/srs/today", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const now = new Date();
    const today = toStudyDate(now);
    const dayStart = new Date(studyDateStartMs(today));

    await backfillCards(db, caller);

    const answeredRows = await db
      .select({ n: count() })
      .from(reviewLogs)
      .where(and(eq(reviewLogs.userId, caller.id), gte(reviewLogs.answeredAt, dayStart)));
    const answeredToday = answeredRows[0]?.n ?? 0;

    // ponytail: due を全件フェッチして数える。 1 ユーザーのカードは解答済み設問数が
    // 上限なので当面問題ない。 数千枚を超えるようなら count クエリに分ける。
    const due = await selectAccessibleCards(db, caller, lte(reviewCards.dueDate, today));
    const capacity = Math.max(0, DAILY_MAX - answeredToday);
    let picked = due.slice(0, capacity).map((r) => r.questionId);

    // 下限 5 問: due が足りない日は「まだ今日解いていない」カードを期日の近い順に前倒し。
    // 今日すでに解いたカード (クイズ本編含む) は lastReviewedAt で除外する。
    const shortfall = DAILY_MIN - answeredToday - picked.length;
    if (shortfall > 0) {
      const fill = await selectAccessibleCards(
        db,
        caller,
        and(gt(reviewCards.dueDate, today), lt(reviewCards.lastReviewedAt, dayStart)) as SQL,
        shortfall,
      );
      picked = [...picked, ...fill.map((r) => r.questionId)];
    }

    const questionRows = picked.length
      ? await db
          .select({
            id: quizQuestions.id,
            kind: quizQuestions.kind,
            prompt: quizQuestions.prompt,
            points: quizQuestions.points,
            order: quizQuestions.order,
          })
          .from(quizQuestions)
          .where(inArray(quizQuestions.id, picked))
      : [];
    const optionRows = picked.length
      ? await db
          .select({
            id: quizOptions.id,
            questionId: quizOptions.questionId,
            label: quizOptions.label,
            order: quizOptions.order,
          })
          .from(quizOptions)
          .where(inArray(quizOptions.questionId, picked))
          .orderBy(asc(quizOptions.order), asc(quizOptions.id))
      : [];

    const byId = new Map(questionRows.map((q) => [q.id, q]));
    // picked の並び (due 順) を保って出題する。
    const questions = picked.flatMap((id) => {
      const q = byId.get(id);
      if (!q) return [];
      return [
        {
          ...q,
          options: optionRows
            .filter((o) => o.questionId === id)
            .map((o) => ({ id: o.id, label: o.label, order: o.order })),
        },
      ];
    });

    const review: SrsTodaySummary = {
      questions,
      answered_today: answeredToday,
      due_total: due.length,
      today,
    };
    return c.json({ review });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 復習 1 問をサーバ採点し、 SM-2 でカードを更新して review_logs に追記する。 */
srsRoute.post("/api/srs/answer", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as {
      question_id?: unknown;
      selected_option_ids?: unknown;
    };
    const questionId = typeof body.question_id === "string" ? body.question_id : "";
    if (!questionId) throw new ApiError("question_id is required", 400);
    const selected = new Set(
      Array.isArray(body.selected_option_ids)
        ? body.selected_option_ids.filter((v): v is string => typeof v === "string")
        : [],
    );

    // カードが無い設問は復習対象外 (先にクイズ本編を解いてカード化される)。
    // 今日の出題リスト外の解答は許す (前倒し学習)。 上限はサーバでは強制しない。
    const cardRows = await db
      .select({ id: reviewCards.id })
      .from(reviewCards)
      .where(and(eq(reviewCards.userId, caller.id), eq(reviewCards.questionId, questionId)))
      .limit(1);
    if (!cardRows[0]) throw new ApiError("review card not found", 404);

    // 出題時と同じ join で受講権限を確認する (退会・非公開化後の解答を防ぐ)。
    const accessible = await selectAccessibleCards(
      db,
      caller,
      eq(reviewCards.questionId, questionId) as SQL,
      1,
    );
    if (accessible.length === 0) throw new ApiError("not authorized for this question", 403);

    const questionRows = await db
      .select({ explanation: quizQuestions.explanation })
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1);
    const correctRows = await db
      .select({ id: quizOptions.id })
      .from(quizOptions)
      .where(and(eq(quizOptions.questionId, questionId), eq(quizOptions.isCorrect, true)));
    const correct = new Set(correctRows.map((r) => r.id));
    const isCorrect = isExactSelection(correct, selected);

    // カード upsert と review_logs 追記は同一トランザクション (withLogs → D1 batch)。
    // 別々に流すと log 側だけ失敗したとき「カードは進んだのに解答数が増えない」ずれが残る。
    const now = new Date();
    const updated = await applyOutcomesToCards(
      db,
      caller.tenantId,
      caller.id,
      [{ questionId, correct: isCorrect }],
      now,
      { withLogs: true },
    );
    const next = updated.get(questionId);
    if (!next) throw new ApiError("card update failed", 500);

    return c.json({
      result: {
        question_id: questionId,
        correct: isCorrect,
        correct_option_ids: [...correct],
        explanation: questionRows[0]?.explanation ?? null,
        due_date: next.dueDate,
        interval_days: next.intervalDays,
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
