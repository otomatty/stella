/**
 * 発見教材 (Discovery) の D1 読み書き (Phase 4)。
 *
 * 3 つのテーブル (`discovery_requests` / `discovery_materials` / `discovery_attempts`)
 * への出入りをここに集める。**秘匿の判定 (誰に見せてよいか) はここには置かない** —
 * 源流ステージの状態で決まるので、評価器を持つルート側 (`routes/discovery.ts` /
 * `routes/skill-map.ts`) が最後に絞る。ここは「テナントで絞って読む」までを担う。
 */

import { and, asc, count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm";

import type {
  DiscoveryGenerator,
  DiscoveryQuestion,
  DiscoveryRequestOrigin,
  DiscoveryReviewStatus,
} from "@stella/shared/discovery/types";
import {
  DISCOVERY_UNLOCK_STAGE_ACTIVE_OR_CLEARED,
  normalizeDiscoveryQuestions,
} from "@stella/shared/discovery/types";

import type { Db } from "../db/client.js";
import {
  assignments,
  discoveryAttempts,
  discoveryMaterials,
  discoveryRequests,
  lessons,
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizzes,
  sections,
  stages,
} from "../db/schema.js";
import type { Caller } from "./authz.js";

/** つまずきの短文の上限 (一意索引の衝突先でもあるので、揺れないよう長さで切る)。 */
const TOPIC_MAX_LENGTH = 160;

export interface DiscoveryRequestRow {
  id: string;
  stageId: string;
  topic: string;
  origin: DiscoveryRequestOrigin;
  createdAt: Date;
  /** この文脈から既に作られた教材の数 (0 なら「未生成」)。 */
  materialCount: number;
}

export interface DiscoveryMaterialRow {
  id: string;
  stageId: string;
  title: string;
  description: string;
  questions: DiscoveryQuestion[];
  source: "ai";
  generator: DiscoveryGenerator;
  reviewStatus: DiscoveryReviewStatus;
  unlockCondition: string;
  requestId: string | null;
  createdAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

/**
 * つまずきを 1 行記録する (**既にあれば何もしない**)。
 *
 * 同じ文脈で何人が何度つまずいても行は増えない — 一意索引 (tenant × stage × topic)
 * に `do nothing` で当てる。講師の待ち行列が同じ話題で埋まるのを防ぐのが目的で、
 * 「何人つまずいたか」は数えない (数えるなら誰かを記録することになる)。
 */
export async function upsertDiscoveryRequest(
  db: Db,
  input: { tenantId: string; stageId: string; topic: string; origin: DiscoveryRequestOrigin },
): Promise<void> {
  const topic = input.topic.trim().slice(0, TOPIC_MAX_LENGTH);
  if (!topic) return;
  await db
    .insert(discoveryRequests)
    .values({
      tenantId: input.tenantId,
      stageId: input.stageId,
      topic,
      origin: input.origin,
      createdAt: new Date(),
    })
    .onConflictDoNothing({
      target: [discoveryRequests.tenantId, discoveryRequests.stageId, discoveryRequests.topic],
    });
}

/**
 * レッスン id からステージ id とレッスン名を引く (つまずきの記録に使う)。
 *
 * **テナントで必ず絞る。** レッスン id は受講者の送るボディから来うるので、絞らないと
 * 他テナントの id を送るだけで「そのテナントのステージに紐づく行」を自分のテナントへ
 * 作れてしまう (`discovery_requests.stage_id` は stages への外部キー = 他テナントの
 * ステージ id が自テナントの行に入る)。
 */
export async function resolveLessonStage(
  db: Db,
  tenantId: string,
  lessonId: string,
): Promise<{ stageId: string; lessonTitle: string } | null> {
  const [row] = await db
    .select({ stageId: sections.stageId, lessonTitle: lessons.title })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(and(eq(lessons.id, lessonId), eq(stages.tenantId, tenantId)))
    .limit(1);
  return row ? { stageId: row.stageId, lessonTitle: row.lessonTitle } : null;
}

/**
 * 課題 id から **正本の** 課題名を引く (つまずきの記録に使う)。
 *
 * 提出行の `assignment_title` は受講者 (VS Code 拡張) が送った文字列がそのまま入って
 * いるので、つまずきの短文には使わない。同じテナントの `assignments` に無い id なら
 * `null` を返し、呼び出し側がレッスン名で組み立てる。
 */
export async function resolveAssignmentTitle(
  db: Db,
  tenantId: string,
  assignmentId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ title: assignments.title })
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.tenantId, tenantId)))
    .limit(1);
  return row?.title ?? null;
}

/** 本人 × この小テストの **不合格** 受験回数 (2 回目でつまずきと見なす)。 */
export async function countFailedQuizAttempts(
  db: Db,
  userId: string,
  quizId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.quizId, quizId),
        eq(quizAttempts.passed, false),
      ),
    );
  return Number(row?.n ?? 0);
}

/** 一覧 (講師のレビュー画面) 用のリクエスト。新しい順。 */
export async function listDiscoveryRequests(
  db: Db,
  tenantId: string,
): Promise<DiscoveryRequestRow[]> {
  const rows = await db
    .select({
      id: discoveryRequests.id,
      stageId: discoveryRequests.stageId,
      topic: discoveryRequests.topic,
      origin: discoveryRequests.origin,
      createdAt: discoveryRequests.createdAt,
    })
    .from(discoveryRequests)
    .where(eq(discoveryRequests.tenantId, tenantId))
    .orderBy(desc(discoveryRequests.createdAt));

  // 「もう教材を作ったか」は **別クエリで数えて JS で合わせる**。相関サブクエリを
  // select 句に埋めると、SQLite が二重引用符付きの外側の列を解決できなかったとき
  // *エラーにならず文字列リテラルとして扱う* ため、常に 0 件という静かな誤りになる
  // (実際に一度そうなった)。件数は待ち行列ぶんしか無いので、2 本に分けて確実を採る。
  const counts = await db
    .select({ requestId: discoveryMaterials.requestId, n: count() })
    .from(discoveryMaterials)
    .where(eq(discoveryMaterials.tenantId, tenantId))
    .groupBy(discoveryMaterials.requestId);
  const countByRequest = new Map(counts.map((row) => [row.requestId, Number(row.n)]));

  return rows.map((row) => ({ ...row, materialCount: countByRequest.get(row.id) ?? 0 }));
}

function toMaterialRow(row: typeof discoveryMaterials.$inferSelect): DiscoveryMaterialRow {
  return {
    id: row.id,
    stageId: row.stageId,
    title: row.title,
    description: row.description,
    // JSON 列は手で書き換えられる余地があるので、読むたびに正規化する。
    questions: normalizeDiscoveryQuestions(row.questions),
    source: row.source,
    generator: row.generator,
    reviewStatus: row.reviewStatus,
    unlockCondition: row.unlockCondition,
    requestId: row.requestId,
    createdAt: row.createdAt,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
  };
}

/** 一覧 (講師のレビュー画面) 用の教材。新しい順。 */
export async function listDiscoveryMaterials(
  db: Db,
  tenantId: string,
): Promise<DiscoveryMaterialRow[]> {
  const rows = await db
    .select()
    .from(discoveryMaterials)
    .where(eq(discoveryMaterials.tenantId, tenantId))
    .orderBy(desc(discoveryMaterials.createdAt));
  return rows.map(toMaterialRow);
}

/** 一覧 (道の脇の ✦ ノード) に要る項目だけ。**設問の全文は持たない。** */
export interface DiscoverySummaryRow {
  id: string;
  stageId: string;
  title: string;
  description: string;
  questionCount: number;
}

/**
 * 承認済み教材の **見出しだけ** (テナントぶん)。
 *
 * ホームを開くたびに走るので、設問の JSON 全文は読まない — 一覧に要るのは題名と
 * 説明と問題数だけで、設問そのものは受験 (`GET /api/discovery/:id`) でだけ要る。
 * 件数は `json_array_length` で D1 に数えさせる (全文を JS へ運んで `length` を
 * 見るのは、読まない列を丸ごと転送するのと同じ)。
 *
 * **公開の可否はここでは決めない** — 呼び出し側が源流ステージの状態で絞る。
 * ここで `approved` に絞るのは、下書きが応答へ漏れる経路をそもそも作らないため。
 */
export async function loadApprovedDiscoverySummaries(
  db: Db,
  tenantId: string,
): Promise<DiscoverySummaryRow[]> {
  const rows = await db
    .select({
      id: discoveryMaterials.id,
      stageId: discoveryMaterials.stageId,
      title: discoveryMaterials.title,
      description: discoveryMaterials.description,
      // 壊れた JSON (json_array_length が null を返す) は 0 問として扱う。
      questionCount: sql<number>`coalesce(json_array_length(${discoveryMaterials.questions}), 0)`,
    })
    .from(discoveryMaterials)
    .where(
      and(
        eq(discoveryMaterials.tenantId, tenantId),
        eq(discoveryMaterials.reviewStatus, "approved"),
      ),
    )
    .orderBy(asc(discoveryMaterials.createdAt));
  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount ?? 0) }));
}

/** 1 件読む (他テナントのものは返さない)。 */
export async function loadDiscoveryMaterial(
  db: Db,
  tenantId: string,
  id: string,
): Promise<DiscoveryMaterialRow | null> {
  const [row] = await db
    .select()
    .from(discoveryMaterials)
    .where(and(eq(discoveryMaterials.id, id), eq(discoveryMaterials.tenantId, tenantId)))
    .limit(1);
  return row ? toMaterialRow(row) : null;
}

export async function loadDiscoveryRequest(
  db: Db,
  tenantId: string,
  id: string,
): Promise<{ id: string; stageId: string; topic: string; origin: DiscoveryRequestOrigin } | null> {
  const [row] = await db
    .select({
      id: discoveryRequests.id,
      stageId: discoveryRequests.stageId,
      topic: discoveryRequests.topic,
      origin: discoveryRequests.origin,
    })
    .from(discoveryRequests)
    .where(and(eq(discoveryRequests.id, id), eq(discoveryRequests.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

export interface NewDiscoveryMaterial {
  tenantId: string;
  stageId: string;
  title: string;
  description: string;
  questions: DiscoveryQuestion[];
  generator: DiscoveryGenerator;
  requestId: string;
}

/** 下書きを 1 件作る。**必ず `draft`** — 生成が承認を兼ねることは無い。 */
export async function insertDiscoveryMaterial(
  db: Db,
  input: NewDiscoveryMaterial,
): Promise<DiscoveryMaterialRow> {
  const [row] = await db
    .insert(discoveryMaterials)
    .values({
      tenantId: input.tenantId,
      stageId: input.stageId,
      title: input.title,
      description: input.description,
      questions: input.questions,
      source: "ai",
      generator: input.generator,
      reviewStatus: "draft",
      unlockCondition: DISCOVERY_UNLOCK_STAGE_ACTIVE_OR_CLEARED,
      requestId: input.requestId,
      createdAt: new Date(),
    })
    .returning();
  if (!row) throw new Error("discovery material insert returned no row");
  return toMaterialRow(row);
}

export interface DiscoveryMaterialPatch {
  title?: string;
  description?: string;
  questions?: DiscoveryQuestion[];
  reviewStatus?: DiscoveryReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
}

/**
 * 教材を書き換える。
 *
 * **`expectedReviewStatus` を渡すと比較交換になる。** 承認は「読んだ設問」に対する
 * 判断なので、読んでから書くまでの間に他の staff が中身を差し替えていたら通しては
 * いけない (差し替えは承認を `draft` へ落とすので、状態を更新条件に含めれば 0 件
 * 更新になって呼び出し側が気づける)。返り値が null なら「もう別の状態だった」。
 */
export async function updateDiscoveryMaterial(
  db: Db,
  tenantId: string,
  id: string,
  patch: DiscoveryMaterialPatch,
  expectedReviewStatus?: DiscoveryReviewStatus,
): Promise<DiscoveryMaterialRow | null> {
  const [row] = await db
    .update(discoveryMaterials)
    .set(patch)
    .where(
      and(
        eq(discoveryMaterials.id, id),
        eq(discoveryMaterials.tenantId, tenantId),
        ...(expectedReviewStatus
          ? [eq(discoveryMaterials.reviewStatus, expectedReviewStatus)]
          : []),
      ),
    )
    .returning();
  return row ? toMaterialRow(row) : null;
}

export interface DiscoveryHistory {
  attemptCount: number;
  passed: boolean;
  lastScore: number | null;
  lastMaxScore: number | null;
  lastAttemptAt: Date | null;
}

/** 本人 × 教材の受験履歴 (再訪時に「合格済み」を復元する)。 */
export async function loadDiscoveryHistory(
  db: Db,
  caller: Caller,
  materialId: string,
): Promise<DiscoveryHistory> {
  const mine = and(
    eq(discoveryAttempts.userId, caller.id),
    eq(discoveryAttempts.materialId, materialId),
  );
  const [totals] = await db
    .select({
      total: count(),
      passed: sql<number>`max(case when ${discoveryAttempts.passed} then 1 else 0 end)`,
    })
    .from(discoveryAttempts)
    .where(mine);
  const [last] = await db
    .select({
      score: discoveryAttempts.score,
      maxScore: discoveryAttempts.maxScore,
      submittedAt: discoveryAttempts.submittedAt,
    })
    .from(discoveryAttempts)
    .where(mine)
    .orderBy(desc(discoveryAttempts.submittedAt))
    .limit(1);
  return {
    attemptCount: Number(totals?.total ?? 0),
    passed: Number(totals?.passed ?? 0) > 0,
    lastScore: last?.score ?? null,
    lastMaxScore: last?.maxScore ?? null,
    lastAttemptAt: last?.submittedAt ?? null,
  };
}

/** 合格した教材の **数** (XP の材料)。同じ教材に何度合格しても 1 つ。 */
export async function loadPassedDiscoveryCount(db: Db, caller: Caller): Promise<number> {
  const [row] = await db
    .select({ n: countDistinct(discoveryAttempts.materialId) })
    .from(discoveryAttempts)
    .where(and(eq(discoveryAttempts.userId, caller.id), eq(discoveryAttempts.passed, true)));
  return Number(row?.n ?? 0);
}

/** 本人 × 複数教材の合格状況 (一覧に「合格済み」の印を出す)。 */
export async function loadPassedDiscoveryIds(
  db: Db,
  caller: Caller,
  materialIds: string[],
): Promise<Set<string>> {
  if (materialIds.length === 0) return new Set();
  const rows = await db
    .select({ materialId: discoveryAttempts.materialId })
    .from(discoveryAttempts)
    .where(
      and(
        eq(discoveryAttempts.userId, caller.id),
        eq(discoveryAttempts.passed, true),
        inArray(discoveryAttempts.materialId, materialIds),
      ),
    );
  return new Set(rows.map((row) => row.materialId));
}

export interface DiscoveryAttemptRecord {
  materialId: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
}

/**
 * 受験を 1 行記録する (合否によらず必ず残す)。
 *
 * 上限は設けない — 発見教材は補強演習で、飛び級のような「開ける」効果を持たない。
 * 何度でも解き直せてよい (XP は教材ごとに 1 回ぶんしか入らない)。
 */
export async function insertDiscoveryAttempt(
  db: Db,
  caller: Caller,
  record: DiscoveryAttemptRecord,
): Promise<void> {
  await db.insert(discoveryAttempts).values({
    tenantId: caller.tenantId,
    userId: caller.id,
    materialId: record.materialId,
    score: record.score,
    maxScore: record.maxScore,
    percent: record.percent,
    passed: record.passed,
    submittedAt: new Date(),
  });
}

/**
 * heuristic フォールバックの材料 — そのステージの既存クイズ設問を、正答つきで読む。
 *
 * **正解の選択肢を 1 つも持たない設問は除く** (腕試しの出題プールと同じ理由: どう
 * 答えても不正解になる設問を混ぜると、合格ラインに手が届かなくなる)。
 */
export async function loadStageQuizQuestionsForCopy(
  db: Db,
  stageId: string,
): Promise<DiscoveryQuestion[]> {
  const questionRows = await db
    .select({
      id: quizQuestions.id,
      prompt: quizQuestions.prompt,
      explanation: quizQuestions.explanation,
    })
    .from(quizQuestions)
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(eq(sections.stageId, stageId));
  if (questionRows.length === 0) return [];

  const ids = questionRows.map((row) => row.id);
  const optionRows = await db
    .select({
      id: quizOptions.id,
      questionId: quizOptions.questionId,
      label: quizOptions.label,
      isCorrect: quizOptions.isCorrect,
      order: quizOptions.order,
    })
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, ids));

  return questionRows.flatMap((q) => {
    const options = optionRows
      .filter((o) => o.questionId === q.id)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      .map((o) => ({ id: o.id, label: o.label, correct: o.isCorrect }));
    if (options.length < 2 || !options.some((o) => o.correct)) return [];
    return [
      {
        id: q.id,
        prompt: q.prompt,
        options,
        ...(q.explanation ? { explanation: q.explanation } : {}),
      },
    ];
  });
}
