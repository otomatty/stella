/**
 * SRS カードの更新。
 *
 * クイズ本編の受験 (`POST /api/quiz/:id/attempt`) と復習の解答 (`POST /api/srs/answer`) の
 * 両方がここを通り、 SM-2 の入力として一本化される。 復習経路は `withLogs` を立てると
 * review_logs の追記までカード upsert と同一トランザクション (D1 batch) に載る
 * (片方だけ確定して「カードは進んだのにログが無い」状態を作らない)。
 */

import { and, eq, inArray, or } from "drizzle-orm";
import { sm2Next, type SrsCardState } from "@stella/shared/srs/sm2";
import { addStudyDays, toStudyDate } from "@stella/shared/study/activity";

import {
  reviewCards,
  reviewLogs,
  quizQuestions,
  quizzes,
  lessons,
  sections,
  stages,
} from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";
import type { Db } from "../db/client.js";

export interface QuestionOutcome {
  questionId: string;
  correct: boolean;
}

export interface UpdatedCard extends SrsCardState {
  id: string;
  questionId: string;
  dueDate: string;
}

/**
 * 設問ごとの正誤を SM-2 でカードに反映する (無ければ新規作成)。
 * `at` は解答時刻。 due はその時点の学習日 (JST) + intervalDays。
 * 反映後のカードを questionId キーで返す。
 *
 * 書き込みは 1 文の upsert (SELECT → INSERT/UPDATE の分岐だと同時書き込みで unique
 * 制約違反になる)。 新規カードと同時挿入が競合した場合、 こちらの生成 id と実際の行 id が
 * ずれ、 withLogs の log 挿入が FK 違反で batch ごと失敗する — 部分確定は起きず、
 * リトライで解消するクリーンな失敗として許容する。
 */
export async function applyOutcomesToCards(
  db: Db,
  tenantId: string,
  userId: string,
  outcomes: readonly QuestionOutcome[],
  at: Date,
  opts: { withLogs?: boolean } = {},
): Promise<Map<string, UpdatedCard>> {
  const updated = new Map<string, UpdatedCard>();
  if (outcomes.length === 0) return updated;

  // format 2 の復習元は knowledge.md だけ。旧形式の小テスト復習は保つ。
  const eligible = new Set<string>();
  for (const ids of chunk(
    outcomes.map((o) => o.questionId),
    50,
  )) {
    const rows = await db
      .select({ id: quizQuestions.id })
      .from(quizQuestions)
      .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
      .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          inArray(quizQuestions.id, ids),
          eq(stages.tenantId, tenantId),
          or(eq(stages.format, 1), eq(quizzes.source, "knowledge")),
        ),
      );
    for (const row of rows) eligible.add(row.id);
  }
  outcomes = outcomes.filter((o) => eligible.has(o.questionId));
  if (outcomes.length === 0) return updated;

  // D1 のバインド上限があるため chunk して読む (バックフィル経路は設問数が多くなり得る)。
  const existing: Array<typeof reviewCards.$inferSelect> = [];
  for (const ids of chunk(
    outcomes.map((o) => o.questionId),
    50,
  )) {
    existing.push(
      ...(await db
        .select()
        .from(reviewCards)
        .where(and(eq(reviewCards.userId, userId), inArray(reviewCards.questionId, ids)))),
    );
  }
  const byQuestion = new Map(existing.map((c) => [c.questionId, c]));
  const today = toStudyDate(at);

  const statements = [];
  for (const o of outcomes) {
    const prev = byQuestion.get(o.questionId);
    const next = sm2Next(
      prev ? { ease: prev.ease, intervalDays: prev.intervalDays, reps: prev.reps } : null,
      o.correct,
    );
    const dueDate = addStudyDays(today, next.intervalDays);
    const cardId = prev?.id ?? crypto.randomUUID();
    statements.push(
      db
        .insert(reviewCards)
        .values({
          id: cardId,
          tenantId,
          userId,
          questionId: o.questionId,
          ...next,
          dueDate,
          lastReviewedAt: at,
        })
        .onConflictDoUpdate({
          target: [reviewCards.userId, reviewCards.questionId],
          set: { ...next, dueDate, lastReviewedAt: at },
        }),
    );
    if (opts.withLogs) {
      // log は必ず自分のカード upsert より後ろ (FK 先が同一 batch 内で先に確定する)。
      statements.push(
        db.insert(reviewLogs).values({
          tenantId,
          userId,
          cardId,
          questionId: o.questionId,
          correct: o.correct,
          answeredAt: at,
        }),
      );
    }
    updated.set(o.questionId, { id: cardId, questionId: o.questionId, dueDate, ...next });
  }

  const [first, ...rest] = statements;
  if (first !== undefined) {
    if (rest.length === 0) await first;
    else await db.batch([first, ...rest]);
  }
  return updated;
}
