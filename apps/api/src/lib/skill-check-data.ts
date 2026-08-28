/**
 * 腕試し (SkillCheck) の D1 読み書き (Phase 3a)。
 *
 * 出題プールは **そのステージの既存クイズ設問** をそのまま使う (腕試し専用の問題を
 * 作らない)。ステージ → セクション → レッスン → クイズ → 設問と辿るだけで、
 * 採点規則も既存の `isExactSelection` を共用する (`routes/quiz.ts` と二重実装しない)。
 */

import { and, count, desc, eq, exists, gte, inArray, lt, sql } from "drizzle-orm";

import { SKILL_CHECK_DAILY_LIMIT } from "@falcon/shared/skill-map/skill-check";
import { addStudyDays, studyDateStartMs, toStudyDate } from "@falcon/shared/study/activity";

import type { Db } from "../db/client.js";
import {
  lessons,
  quizOptions,
  quizQuestions,
  quizzes,
  sections,
  skillCheckAttempts,
  stageUnlocks,
} from "../db/schema.js";
import type { Caller } from "./authz.js";

/**
 * 出題候補になる設問 id (そのステージのクイズ設問)。
 *
 * **正解の選択肢を 1 つも持たない設問は除く。** 採点は「正解集合と選択集合の完全一致」
 * なので、正解が無い設問はどう答えても不正解になり、配点だけが満点に乗る
 * (10 問中 2 問がそれだと 80% の合格ラインに手が届かなくなる)。教材の作りかけ /
 * 記述式のように正解を持たない設問は、腕試しの土俵から外す。
 */
export async function loadStageQuestionIds(db: Db, stageId: string): Promise<string[]> {
  const rows = await db
    .select({ id: quizQuestions.id })
    .from(quizQuestions)
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(
      and(
        eq(sections.stageId, stageId),
        exists(
          db
            .select({ one: sql`1` })
            .from(quizOptions)
            .where(
              and(eq(quizOptions.questionId, quizQuestions.id), eq(quizOptions.isCorrect, true)),
            ),
        ),
      ),
    );
  return rows.map((row) => row.id);
}

/** 受験者に見せる 1 問 (正解・解説は含めない)。 */
export interface SkillCheckQuestion {
  id: string;
  kind: "single" | "multiple" | "boolean";
  prompt: string;
  points: number;
  options: { id: string; label: string }[];
}

/**
 * 受験票ぶんの設問を、選択肢つきで読む。**正解 (`is_correct`) と解説は載せない。**
 *
 * 並びは受験票 (`ids`) の順を保つ。D1 の返す順に任せると、同じ受験票でも問題の
 * 並びが揺れて「さっきと違う」と見えるため。
 */
export async function loadSkillCheckQuestions(
  db: Db,
  ids: string[],
): Promise<SkillCheckQuestion[]> {
  if (ids.length === 0) return [];
  const questionRows = await db
    .select({
      id: quizQuestions.id,
      kind: quizQuestions.kind,
      prompt: quizQuestions.prompt,
      points: quizQuestions.points,
    })
    .from(quizQuestions)
    .where(inArray(quizQuestions.id, ids));

  const optionRows = await db
    .select({
      id: quizOptions.id,
      questionId: quizOptions.questionId,
      label: quizOptions.label,
      order: quizOptions.order,
    })
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, ids));

  const byId = new Map(questionRows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const q = byId.get(id);
    if (!q) return [];
    return [
      {
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        points: q.points,
        options: optionRows
          .filter((o) => o.questionId === id)
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
          .map((o) => ({ id: o.id, label: o.label })),
      },
    ];
  });
}

/** 採点用: 設問 id → 正解の選択肢 id 集合。 */
export async function loadCorrectOptionIds(
  db: Db,
  ids: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({ questionId: quizOptions.questionId, id: quizOptions.id })
    .from(quizOptions)
    .where(and(inArray(quizOptions.questionId, ids), eq(quizOptions.isCorrect, true)));
  for (const row of rows) {
    const set = map.get(row.questionId) ?? new Set<string>();
    set.add(row.id);
    map.set(row.questionId, set);
  }
  return map;
}

export interface SkillCheckHistory {
  attemptCount: number;
  /** 今日 (アプリ基準 TZ の暦日) の受験回数。上限まであと何回かの表示に使う。 */
  attemptsToday: number;
  passed: boolean;
  lastScore: number | null;
  lastMaxScore: number | null;
  lastAttemptAt: Date | null;
}

/** アプリ基準 TZ (JST) の「今日」の範囲を UTC ミリ秒で返す。 */
function studyDayRange(now: Date): { startMs: number; endMs: number } {
  const today = toStudyDate(now);
  return {
    startMs: studyDateStartMs(today),
    endMs: studyDateStartMs(addStudyDays(today, 1)),
  };
}

/**
 * 本人 × ステージの受験履歴。
 *
 * `attemptCount` は **次の受験票の種** でもある (`selectSkillCheckPaper` の `attempt`)。
 * 出題と採点の両方でここを引くので、件数の意味は「まだ記録していない今回を含まない」
 * で揃える。
 *
 * 行を全部読まない — 受験は上限つきとはいえ何日も積み上がるので、要るのは
 * **集計 (件数 2 つ + 合格の有無) と直近 1 行** だけ。索引
 * (`skill_check_attempts_user_stage_idx`) がそのまま効く形に分けてある。
 */
export async function loadSkillCheckHistory(
  db: Db,
  caller: Caller,
  stageId: string,
  now: Date = new Date(),
): Promise<SkillCheckHistory> {
  const day = studyDayRange(now);
  const mine = and(
    eq(skillCheckAttempts.userId, caller.id),
    eq(skillCheckAttempts.stageId, stageId),
  );

  const [totals] = await db
    .select({
      total: count(),
      today: sql<number>`sum(case when ${skillCheckAttempts.submittedAt} >= ${day.startMs}
        and ${skillCheckAttempts.submittedAt} < ${day.endMs} then 1 else 0 end)`,
      passed: sql<number>`max(case when ${skillCheckAttempts.passed} then 1 else 0 end)`,
    })
    .from(skillCheckAttempts)
    .where(mine);

  const [last] = await db
    .select({
      score: skillCheckAttempts.score,
      maxScore: skillCheckAttempts.maxScore,
      submittedAt: skillCheckAttempts.submittedAt,
    })
    .from(skillCheckAttempts)
    .where(mine)
    .orderBy(desc(skillCheckAttempts.submittedAt))
    .limit(1);

  return {
    attemptCount: Number(totals?.total ?? 0),
    attemptsToday: Number(totals?.today ?? 0),
    passed: Number(totals?.passed ?? 0) > 0,
    lastScore: last?.score ?? null,
    lastMaxScore: last?.maxScore ?? null,
    lastAttemptAt: last?.submittedAt ?? null,
  };
}

/**
 * 受験票の導出だけに要る「これまでの受験回数」。
 *
 * 採点 (POST) は直近のスコアも合格の有無も使わないので、履歴一式ではなくこちらを引く。
 */
export async function loadSkillCheckAttemptCount(
  db: Db,
  caller: Caller,
  stageId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(skillCheckAttempts)
    .where(and(eq(skillCheckAttempts.userId, caller.id), eq(skillCheckAttempts.stageId, stageId)));
  return Number(row?.total ?? 0);
}

export interface SkillCheckAttemptRecord {
  stageId: string;
  /**
   * この受験票を導いた「これまでの受験回数」(`selectSkillCheckPaper` の `attempt`)。
   * 記録時にも同じ値であることを要求する — 下の比較交換の軸。
   */
  expectedAttempt: number;
  score: number;
  maxScore: number;
  passed: boolean;
  questionIds: string[];
  answers: unknown[];
}

/**
 * 受験の記録結果。
 *   - `recorded`    … 記録できた (採点を返してよい)
 *   - `daily_limit` … 今日の上限に達していた
 *   - `stale_paper` … 別の受験が先に記録された (2 タブ同時提出 / 並列 POST)
 */
export type SkillCheckInsertOutcome = "recorded" | "daily_limit" | "stale_paper";

/**
 * 受験を 1 行記録する (合否によらず必ず残す — 次の受験票の種になる)。
 *
 * **上限判定と記録を 1 文に畳む** (`routes/quiz.ts` の受験回数上限と同じ流儀)。
 * 「数えてから INSERT」に分けると、同時に投げた複数のリクエストがどれも INSERT 前の
 * 件数を読み、全部通ってしまう。判定を `insert ... select ... where` の中へ入れ、
 * 実際に挿入されたか (`meta.changes`) だけで決める。
 *
 * 条件は 2 つ:
 *   1. **今日の受験がまだ上限に達していない** … 総当たりの防波堤 (B1)
 *   2. **これまでの受験回数が受験票の導出時と同じ** … 比較交換。同じ受験票から
 *      2 通提出しても 1 通しか通らない (2 通目は採点済みでも記録されない)
 *
 * どちらで落ちたかは、落ちたときだけ数え直して見分ける (成功path に往復を足さない)。
 */
export async function insertSkillCheckAttempt(
  db: Db,
  caller: Caller,
  record: SkillCheckAttemptRecord,
): Promise<SkillCheckInsertOutcome> {
  const now = new Date();
  const day = studyDayRange(now);
  const inserted = await db.run(
    sql`insert into skill_check_attempts
          (id, tenant_id, user_id, stage_id, score, max_score, passed, question_ids, answers, submitted_at)
        select ${crypto.randomUUID()}, ${caller.tenantId}, ${caller.id}, ${record.stageId},
               ${record.score}, ${record.maxScore}, ${record.passed ? 1 : 0},
               ${JSON.stringify(record.questionIds)}, ${JSON.stringify(record.answers)}, ${now.getTime()}
        where (select count(*) from skill_check_attempts
                 where user_id = ${caller.id} and stage_id = ${record.stageId}
                   and submitted_at >= ${day.startMs} and submitted_at < ${day.endMs})
              < ${SKILL_CHECK_DAILY_LIMIT}
          and (select count(*) from skill_check_attempts
                 where user_id = ${caller.id} and stage_id = ${record.stageId})
              = ${record.expectedAttempt}`,
  );
  if (inserted.meta.changes > 0) return "recorded";

  const [row] = await db
    .select({ today: count() })
    .from(skillCheckAttempts)
    .where(
      and(
        eq(skillCheckAttempts.userId, caller.id),
        eq(skillCheckAttempts.stageId, record.stageId),
        gte(skillCheckAttempts.submittedAt, new Date(day.startMs)),
        lt(skillCheckAttempts.submittedAt, new Date(day.endMs)),
      ),
    );
  return Number(row?.today ?? 0) >= SKILL_CHECK_DAILY_LIMIT ? "daily_limit" : "stale_paper";
}

/**
 * 飛び級で開いた星を記録する。
 *
 * 既にあれば何もしない (`do nothing`) — 2 度目の合格で `unlocked_at` を上書きすると、
 * 「いつ開いたか」が受け直すたびに新しくなってしまう。テナントは行の作成時のものを
 * 残す (テナントを移った受講者の解放は、移動先で取り直すのが正しい)。
 */
export async function upsertStageUnlock(db: Db, caller: Caller, stageId: string): Promise<void> {
  await db
    .insert(stageUnlocks)
    .values({
      tenantId: caller.tenantId,
      userId: caller.id,
      stageId,
      via: "skill_check",
      unlockedAt: new Date(),
    })
    .onConflictDoNothing({ target: [stageUnlocks.userId, stageUnlocks.stageId] });
}

/**
 * 飛び級で開いた星の id 集合 (評価器の `unlockedStageIds`)。
 *
 * テナントも絞る — テナントを移った受講者の古い行が残っていると、他テナントの星が
 * 開いたままになる (`loadEnrolledStageIds` と同じ理由)。
 */
export async function loadUnlockedStageIds(db: Db, caller: Caller): Promise<Set<string>> {
  const rows = await db
    .select({ stageId: stageUnlocks.stageId })
    .from(stageUnlocks)
    .where(and(eq(stageUnlocks.userId, caller.id), eq(stageUnlocks.tenantId, caller.tenantId)));
  return new Set(rows.map((row) => row.stageId));
}
