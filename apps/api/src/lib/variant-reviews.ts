/**
 * コードの復習: 類題の出題 (#39・07 §7.2・03 §7)。
 *
 * - 出す時期と目的は `@stella/shared/tasks/variants` の `nextVariantSlot`、在庫から選ぶのは
 *   `pickVariant` が決める。ここはそれを受講者の記録 (`variant_reviews`) に当てる。
 * - 受講者が今日の類題の画面 (`GET /api/variant-reviews/today`) を開いたときに、その受講者の分だけ
 *   遅延して積む・出す。cron で全受講者を回すと D1 のクエリ上限を他の処理と分け合ううえ、画面を
 *   開かない受講者の出題が溜まるだけなので採らない。同時に開いても、一意制約 (同じ段を 2 度積まない・
 *   同じ類題を 2 度出さない・出したまま合格していない類題は 1 つ) が二重の出題を止める。
 * - 1 日に出すのは 1 問。出した類題に合格するまで次を出さない。
 * - 出題した類題は、配布・提出・AI の一次レビュー・ヘルプ・手元の実行記録の既存の流れで使う
 *   (`canAccessTask`)。出題より前は、どの API も類題を返さない。
 * - どの読み書きも受講者のテナントと本人で絞る。
 */

import { and, asc, eq, inArray, lt, ne } from "drizzle-orm";
import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";
import { toStudyDate } from "@stella/shared/study/activity";
import type { TaskStatus } from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import {
  CHECK_VARIANT_KINDS,
  nextVariantSlot,
  type PatternCompletion,
  pickVariant,
  REMEDIAL_VARIANT_KINDS,
  SPACED_VARIANT_PURPOSES,
  type TodayVariantReview,
  type VariantSlot,
  type VariantStockItem,
  type VariantStockSummary,
} from "@stella/shared/tasks/variants";
import type { Db } from "../db/client.js";
import {
  enrollments,
  profiles,
  sections,
  skillEvidence,
  stages,
  submissions,
  taskProgress,
  tasks,
  variantReviews,
} from "../db/schema.js";
import type { Caller } from "./authz.js";
import { isAssistedSubmission } from "./task-support.js";

/** 1 回の要求で、新たに起点に達したパターンの支援の判定をする数 (D1 のクエリ数を抑える)。 */
const NEW_PATTERNS_PER_REQUEST = 3;
const PASSED: readonly string[] = ["passed", "ai-passed"];

type ReviewRow = typeof variantReviews.$inferSelect;
type Scope = { tenantId: string; userId: string };

function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e instanceof Error; e = e.cause)
    if (/UNIQUE constraint failed/i.test(e.message)) return true;
  return false;
}

/** 受講者本人の出題の記録 1 行 (書き込みもテナントと本人で絞る)。 */
function ownRow(scope: Scope, id: string) {
  return and(
    eq(variantReviews.tenantId, scope.tenantId),
    eq(variantReviews.userId, scope.userId),
    eq(variantReviews.id, id),
  );
}

function rowsOf(db: Db, scope: Scope) {
  return db
    .select()
    .from(variantReviews)
    .where(
      and(eq(variantReviews.tenantId, scope.tenantId), eq(variantReviews.userId, scope.userId)),
    )
    .orderBy(asc(variantReviews.pattern), asc(variantReviews.step));
}

/**
 * 受講者が今読めるステージ (公開中の format 2 で、受講中か修了) の有効な課題と類題、その進捗。
 * 練習 (類題でない課題) は起点の判定に、類題は在庫に使う。
 */
function readableTasksOf(db: Db, caller: Caller) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      pattern: tasks.pattern,
      kind: tasks.kind,
      order: tasks.order,
      contentHash: tasks.contentHash,
      variantOf: tasks.variantOf,
      status: taskProgress.status,
      progressHash: taskProgress.contentHash,
      passedAt: taskProgress.passedAt,
    })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.stageId, stages.id),
        eq(enrollments.tenantId, caller.tenantId),
        eq(enrollments.userId, caller.id),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    )
    .leftJoin(
      taskProgress,
      and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, caller.id)),
    )
    .where(
      and(
        eq(stages.tenantId, caller.tenantId),
        eq(stages.status, "published"),
        eq(stages.format, 2),
        eq(tasks.active, true),
      ),
    );
}
type ReadableTask = Awaited<ReturnType<typeof readableTasksOf>>[number];

/** その課題の最初の合格の提出が支援付きか。合格の提出が見つからなければ自力として扱う。 */
async function firstPassAssisted(db: Db, scope: Scope, taskId: string): Promise<boolean> {
  const [pass] = await db
    .select({
      tenantId: submissions.tenantId,
      submittedAt: submissions.submittedAt,
      supportLog: submissions.supportLog,
      submissionMode: submissions.submissionMode,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.tenantId, scope.tenantId),
        eq(submissions.studentId, scope.userId),
        eq(submissions.taskId, taskId),
        eq(submissions.verdict, "pass"),
      ),
    )
    .orderBy(asc(submissions.submittedAt))
    .limit(1);
  if (!pass) return false;
  return isAssistedSubmission(db, { ...pass, studentId: scope.userId, taskId });
}

/**
 * パターンの起点: 練習 (類題でも確認Bでもない、そのパターンの課題) にすべて合格した時点。
 * 確認Bは起点のあとに解く後日の確認なので含めない。合格は課題一覧と同じく、版が変わっても合格。
 */
function completionOf(practice: ReadableTask[]): { at: number; lastTaskId: string } | null {
  if (practice.length === 0) return null;
  let last: { at: number; lastTaskId: string } | null = null;
  for (const task of practice) {
    if (!task.status || !PASSED.includes(task.status) || !task.passedAt) return null;
    const at = task.passedAt.getTime();
    if (!last || at > last.at) last = { at, lastTaskId: task.id };
  }
  return last;
}

async function insertSlot(db: Db, scope: Scope, pattern: string, slot: VariantSlot, now: Date) {
  // 同じ受講者・パターンの同じ段は一意。同時に開いた別の要求が先に積んでいれば何もしない。
  await db
    .insert(variantReviews)
    .values({
      tenantId: scope.tenantId,
      userId: scope.userId,
      pattern,
      step: slot.step,
      purpose: slot.purpose,
      anchorAt: new Date(slot.anchorAt),
      dueOn: slot.dueOn,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

/**
 * 出した類題の合格と、教材から外れたことを記録に写す。合格は AI か人の合格 (`task_progress`)
 * で、支援付きかは最初の合格の提出から決める (スキルの証拠と同じ判定)。
 */
async function syncIssued(db: Db, scope: Scope, rows: ReviewRow[], now: Date) {
  const issued = rows.filter((r) => r.status === "issued" && r.variantTaskId);
  if (issued.length === 0) return false;
  const states = await db
    .select({
      id: tasks.id,
      active: tasks.active,
      status: taskProgress.status,
      passedAt: taskProgress.passedAt,
    })
    .from(tasks)
    .leftJoin(
      taskProgress,
      and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, scope.userId)),
    )
    .where(
      inArray(
        tasks.id,
        issued.map((r) => r.variantTaskId as string),
      ),
    );
  const byId = new Map(states.map((s) => [s.id, s]));
  let changed = false;
  for (const row of issued) {
    const state = byId.get(row.variantTaskId as string);
    const where = and(ownRow(scope, row.id), eq(variantReviews.status, "issued"));
    if (!state?.active) {
      // 出した類題の ID は出題済みとして残す (教材に戻っても「未見」として出し直さない)。
      await db.update(variantReviews).set({ status: "withdrawn", updatedAt: now }).where(where);
      changed = true;
    } else if (state.status && PASSED.includes(state.status) && state.passedAt) {
      const assisted = await firstPassAssisted(db, scope, state.id);
      await db
        .update(variantReviews)
        .set({
          status: "passed",
          passedAt: state.passedAt,
          passedAssisted: assisted,
          updatedAt: now,
        })
        .where(where);
      changed = true;
    }
  }
  return changed;
}

/** 合格した出題と、起点に達したパターンから、次の出題を積む。 */
async function planNext(
  db: Db,
  scope: Scope,
  rows: ReviewRow[],
  readable: ReadableTask[],
  now: Date,
) {
  const byPattern = new Map<string, ReviewRow[]>();
  for (const row of rows) byPattern.set(row.pattern, [...(byPattern.get(row.pattern) ?? []), row]);
  const practiceByPattern = new Map<string, ReadableTask[]>();
  const regularB = new Set<string>();
  for (const task of readable) {
    if (task.variantOf !== null) continue;
    if (task.kind === "assessment-b") {
      regularB.add(task.pattern);
      continue;
    }
    practiceByPattern.set(task.pattern, [...(practiceByPattern.get(task.pattern) ?? []), task]);
  }
  let planned = false;
  for (const [pattern, records] of byPattern) {
    const slot = nextVariantSlot(
      records.map((r) => ({
        step: r.step,
        purpose: r.purpose,
        status: r.status,
        anchorAt: r.anchorAt.getTime(),
        dueOn: r.dueOn,
        passedAt: r.passedAt?.getTime() ?? null,
        passedAssisted: r.passedAssisted,
      })),
      null,
      { hasRegularAssessmentB: regularB.has(pattern) },
    );
    if (slot) {
      await insertSlot(db, scope, pattern, slot, now);
      planned = true;
    }
  }
  // 起点に達したパターンの最初の出題。支援付きかの判定は 1 パターンにつき 1 度だけ (積んだあとは
  // 記録から決める)。1 回の要求で判定する数は絞り、残りは次に開いたときに積む。
  let judged = 0;
  for (const [pattern, practice] of practiceByPattern) {
    if (byPattern.has(pattern) || judged >= NEW_PATTERNS_PER_REQUEST) continue;
    const reached = completionOf(practice);
    if (!reached) continue;
    judged += 1;
    const completion: PatternCompletion = {
      at: reached.at,
      assisted: await firstPassAssisted(db, scope, reached.lastTaskId),
    };
    const slot = nextVariantSlot([], completion, {
      hasRegularAssessmentB: regularB.has(pattern),
    });
    if (slot) {
      await insertSlot(db, scope, pattern, slot, now);
      planned = true;
    }
  }
  return planned;
}

/**
 * 出す日になった出題に、在庫から未見の類題を選んで出す。1 日 1 問で、出したまま合格していない
 * 類題があれば出さない。未見の類題が無ければ在庫切れとして残し、次に開いたときに選び直す。
 */
async function issueDue(
  db: Db,
  scope: Scope,
  rows: ReviewRow[],
  readable: ReadableTask[],
  today: string,
  now: Date,
) {
  if (rows.some((r) => r.status === "issued")) return;
  // 1 日 1 問。教材から外れて取り下げた出題は数えない (同じ日に出し直せる)。
  if (rows.some((r) => r.status !== "withdrawn" && r.issuedAt && toStudyDate(r.issuedAt) === today))
    return;
  const due = rows
    .filter((r) => (r.status === "scheduled" || r.status === "out-of-stock") && r.dueOn <= today)
    .sort(
      (a, b) =>
        a.dueOn.localeCompare(b.dueOn) || a.step - b.step || a.pattern.localeCompare(b.pattern),
    );
  if (due.length === 0) return;
  const seen = new Set(rows.flatMap((r) => (r.variantTaskId ? [r.variantTaskId] : [])));
  const stockByPattern = new Map<string, VariantStockItem[]>();
  for (const task of readable) {
    if (task.variantOf === null) continue;
    const item = { id: task.id, kind: task.kind as TaskKind, order: task.order };
    stockByPattern.set(task.pattern, [...(stockByPattern.get(task.pattern) ?? []), item]);
  }
  for (const row of due) {
    const picked = pickVariant(row.purpose, stockByPattern.get(row.pattern) ?? [], seen);
    if (!picked) {
      if (row.status !== "out-of-stock")
        await db
          .update(variantReviews)
          .set({ status: "out-of-stock", updatedAt: now })
          .where(and(ownRow(scope, row.id), eq(variantReviews.status, "scheduled")));
      continue;
    }
    try {
      const updated = await db
        .update(variantReviews)
        .set({ status: "issued", variantTaskId: picked.id, issuedAt: now, updatedAt: now })
        .where(
          and(ownRow(scope, row.id), inArray(variantReviews.status, ["scheduled", "out-of-stock"])),
        )
        .returning({ id: variantReviews.id });
      if (updated.length > 0) return;
    } catch (err) {
      // 同時に開いた別の要求が先に出した (出したままの類題は 1 つ・同じ類題は 1 度)。
      if (isUniqueViolation(err)) return;
      throw err;
    }
  }
}

/**
 * 今日の類題を返す。出したまま合格していない類題、無ければ今日出して合格した類題。
 * 画面を開いたときに、合格の記録・次の出題・在庫からの出題をこの受講者の分だけ進める。
 */
export async function loadTodayVariant(
  db: Db,
  caller: Caller,
  now = new Date(),
): Promise<TodayVariantReview | null> {
  const scope = { tenantId: caller.tenantId, userId: caller.id };
  const today = toStudyDate(now);
  let rows = await rowsOf(db, scope);
  if (await syncIssued(db, scope, rows, now)) rows = await rowsOf(db, scope);
  const readable = await readableTasksOf(db, caller);
  if (await planNext(db, scope, rows, readable, now)) rows = await rowsOf(db, scope);
  await issueDue(db, scope, rows, readable, today, now);
  rows = await rowsOf(db, scope);
  // 出したまま合格していない類題。無ければ、今日出したか今日合格した類題 (合格を画面で返す)。
  const current =
    rows.find((r) => r.status === "issued") ??
    rows
      .filter(
        (r) =>
          r.status === "passed" &&
          [r.issuedAt, r.passedAt].some((at) => at && toStudyDate(at) === today),
      )
      .sort((a, b) => (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0))[0];
  if (!current?.variantTaskId || !current.issuedAt) return null;
  // 今も読める類題だけを出す (受講をやめたステージの類題は出さない)。
  const task = readable.find((t) => t.id === current.variantTaskId);
  if (!task) return null;
  // 課題一覧と同じく、合格は版が変わっても合格のまま。ほかの状態は今の版の進み具合として読む。
  const status: TaskStatus =
    task.status && (PASSED.includes(task.status) || task.progressHash === task.contentHash)
      ? (task.status as TaskStatus)
      : "not-started";
  return {
    taskId: task.id,
    title: task.title,
    kind: task.kind as TaskKind,
    pattern: current.pattern,
    purpose: current.purpose,
    dueOn: current.dueOn,
    issuedAt: current.issuedAt.toISOString(),
    status,
  };
}

/**
 * 時間を空けた類題の自力の合格で「時間を空けて確認」にできるスキル (#39)。出題の目的が時間を
 * 空けた類題 (3 日後・1 週間後・3 週間後) で、提出が出題のあとのときだけ。確認Bの定着
 * (`retentionBasis`) と同じく、出題より前に同じパターンの課題に支援なしで合格した証拠がある
 * スキルに限る (後日の別問題でも適用できた、03 §7)。当たらなければ null。
 */
export async function variantRetentionSkills(
  db: Db,
  row: { tenantId: string; studentId: string; taskId: string; pattern: string; submittedAt: Date },
): Promise<Set<string> | null> {
  const [review] = await db
    .select({ issuedAt: variantReviews.issuedAt })
    .from(variantReviews)
    .where(
      and(
        eq(variantReviews.tenantId, row.tenantId),
        eq(variantReviews.userId, row.studentId),
        eq(variantReviews.variantTaskId, row.taskId),
        inArray(variantReviews.purpose, [...SPACED_VARIANT_PURPOSES]),
        inArray(variantReviews.status, ["issued", "passed"]),
      ),
    )
    .limit(1);
  if (!review?.issuedAt || row.submittedAt.getTime() < review.issuedAt.getTime()) return null;
  const evidence = await db
    .selectDistinct({ skillId: skillEvidence.skillId })
    .from(skillEvidence)
    .innerJoin(submissions, eq(submissions.id, skillEvidence.submissionId))
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .where(
      and(
        eq(skillEvidence.tenantId, row.tenantId),
        eq(skillEvidence.userId, row.studentId),
        eq(skillEvidence.assisted, false),
        eq(submissions.tenantId, row.tenantId),
        eq(submissions.studentId, row.studentId),
        eq(tasks.pattern, row.pattern),
        ne(submissions.taskId, row.taskId),
        lt(submissions.submittedAt, review.issuedAt),
      ),
    );
  return new Set(evidence.map((e) => e.skillId));
}

/**
 * 講師・管理者向け: パターンごとの類題の在庫と、在庫切れで待っている受講者 (#39)。
 * テナントの講座の課題があるパターンと、在庫切れの出題があるパターンを並べ、待っている
 * 受講者のいるパターンを先にする。
 */
export async function loadVariantStock(db: Db, caller: Caller): Promise<VariantStockSummary[]> {
  const [taskRows, waiting] = await Promise.all([
    db
      .select({ pattern: tasks.pattern, kind: tasks.kind, variantOf: tasks.variantOf })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(eq(stages.tenantId, caller.tenantId), eq(stages.format, 2), eq(tasks.active, true)),
      ),
    db
      .select({
        userId: variantReviews.userId,
        name: profiles.displayName,
        pattern: variantReviews.pattern,
        purpose: variantReviews.purpose,
        dueOn: variantReviews.dueOn,
      })
      .from(variantReviews)
      .innerJoin(profiles, eq(profiles.id, variantReviews.userId))
      .where(
        and(
          eq(variantReviews.tenantId, caller.tenantId),
          eq(profiles.tenantId, caller.tenantId),
          eq(variantReviews.status, "out-of-stock"),
        ),
      )
      .orderBy(asc(variantReviews.dueOn)),
  ]);
  const summaries = new Map<string, VariantStockSummary>();
  const summaryOf = (pattern: string) => {
    let s = summaries.get(pattern);
    if (!s) {
      s = { pattern, stock: { remedial: 0, check: 0 }, waiting: [] };
      summaries.set(pattern, s);
    }
    return s;
  };
  for (const task of taskRows) {
    const s = summaryOf(task.pattern);
    if (task.variantOf === null) continue;
    const kind = task.kind as TaskKind;
    if (REMEDIAL_VARIANT_KINDS.includes(kind)) s.stock.remedial += 1;
    else if (CHECK_VARIANT_KINDS.includes(kind)) s.stock.check += 1;
  }
  for (const { pattern, ...w } of waiting) summaryOf(pattern).waiting.push(w);
  return [...summaries.values()].sort(
    (a, b) =>
      Number(b.waiting.length > 0) - Number(a.waiting.length > 0) ||
      a.pattern.localeCompare(b.pattern),
  );
}
