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
 * - 人が類題の合格を覆したら、出題の記録を「出した」に戻し、まだ出していない次の出題を取り消す
 *   (`reopenVariantStatements`)。受講者がやり直して合格したら、合格の記録と次の出題を付け直す。
 * - 出題した類題は、配布・提出・AI の一次レビュー・ヘルプ・手元の実行記録の既存の流れで使う
 *   (`canAccessTask`)。出題より前は、どの API も類題を返さない。
 * - どの読み書きも受講者のテナントと本人で絞る。
 */

import { and, asc, eq, exists, inArray, lt, ne, notExists, notInArray } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { BatchItem } from "drizzle-orm/batch";
import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";
import { toStudyDate } from "@stella/shared/study/activity";
import type { TaskStatus } from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import {
  assistDecidingPass,
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

/**
 * 合格 (`task_progress` の今の合格) の最初の提出が支援付きか。`task_progress.passed_at` は版が
 * 変わったあとの合格ではその版の最初の合格日になるので、提出も進捗と同じ版 (`contentHash`) の
 * 合格に絞り、起点の日時と同じ合格で判定する (旧版の合格の支援を持ち込まない)。合格の提出が
 * 見つからなければ自力として扱う。
 */
async function firstPassAssisted(
  db: Db,
  scope: Scope,
  taskId: string,
  contentHash: string | null,
): Promise<boolean> {
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
        contentHash === null ? undefined : eq(submissions.taskContentHash, contentHash),
      ),
    )
    .orderBy(asc(submissions.submittedAt))
    .limit(1);
  if (!pass) return false;
  return isAssistedSubmission(db, { ...pass, studentId: scope.userId, taskId });
}

/**
 * 受講者が今読めるステージの、パターンごとの練習 (類題でも確認Bでもない課題) と、通常の確認Bが
 * あるパターン。練習が 1 つも無いパターン (教材から外れた・受講をやめた) は、新しい出題を積まず、
 * 積んであっても出さない (出した類題はそのまま解ける)。
 */
function practiceOf(readable: ReadableTask[]) {
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
  return { practiceByPattern, regularB };
}

/**
 * パターンの起点: 練習 (類題でも確認Bでもない、そのパターンの課題) にすべて合格した時点。
 * 確認Bは起点のあとに解く後日の確認なので含めない。合格は課題一覧と同じく、版が変わっても合格。
 * 自力か支援付きかは、練習のうち種別がいちばん難しい課題の合格で決める (`assistDecidingPass`)。
 */
function completionOf(
  practice: ReadableTask[],
): { at: number; decidingTaskId: string; decidingHash: string | null } | null {
  if (practice.length === 0) return null;
  const passes: { id: string; kind: string; passedAt: number; hash: string | null }[] = [];
  for (const task of practice) {
    if (!task.status || !PASSED.includes(task.status) || !task.passedAt) return null;
    passes.push({
      id: task.id,
      kind: task.kind,
      passedAt: task.passedAt.getTime(),
      hash: task.progressHash,
    });
  }
  const deciding = assistDecidingPass(passes);
  if (!deciding) return null;
  return {
    at: Math.max(...passes.map((p) => p.passedAt)),
    decidingTaskId: deciding.id,
    decidingHash: deciding.hash,
  };
}

/**
 * 次の出題を積む。`after` は、この出題を決めた前の段 (その段と、決めたときの状態)。
 * 人が前の段の合格を覆す (`reopenVariantStatements`) のと重なっても、覆した合格から決めた出題を
 * 残さないよう、積むのと「前の段がまだその状態か」の確かめを 1 つの batch (D1 では 1 つの
 * トランザクション) で行い、違えば積んだ行をその場で消す。書き込みは直列なので、覆すのが先なら
 * ここで消え、積むのが先なら覆す側の条件付きの削除で消える。
 */
async function insertSlot(
  db: Db,
  scope: Scope,
  pattern: string,
  slot: VariantSlot,
  now: Date,
  after?: { step: number; status: ReviewRow["status"] },
) {
  const id = crypto.randomUUID();
  // 同じ受講者・パターンの同じ段は一意。同時に開いた別の要求が先に積んでいれば何もしない。
  const insert = db
    .insert(variantReviews)
    .values({
      id,
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
  if (!after) {
    await insert;
    return;
  }
  const previous = alias(variantReviews, "previous_step");
  await db.batch([
    insert,
    db.delete(variantReviews).where(
      and(
        ownRow(scope, id),
        notExists(
          db
            .select({ id: previous.id })
            .from(previous)
            .where(
              and(
                eq(previous.tenantId, scope.tenantId),
                eq(previous.userId, scope.userId),
                eq(previous.pattern, pattern),
                eq(previous.step, after.step),
                eq(previous.status, after.status),
              ),
            ),
        ),
      ),
    ),
  ]);
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
      progressHash: taskProgress.contentHash,
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
      const assisted = await firstPassAssisted(db, scope, state.id, state.progressHash);
      // 読んでから書くまでに人が合格を覆していたら写さない (書くときの進捗がまだ同じ合格か確かめる)。
      // 覆すのが後なら、覆す側が「合格」の記録を条件で戻す (`reopenVariantStatements`)。
      await db
        .update(variantReviews)
        .set({
          status: "passed",
          passedAt: state.passedAt,
          passedAssisted: assisted,
          updatedAt: now,
        })
        .where(
          and(
            where,
            exists(
              db
                .select({ userId: taskProgress.userId })
                .from(taskProgress)
                .where(
                  and(
                    eq(taskProgress.userId, scope.userId),
                    eq(taskProgress.taskId, state.id),
                    inArray(taskProgress.status, ["passed", "ai-passed"]),
                    eq(taskProgress.passedAt, state.passedAt),
                  ),
                ),
            ),
          ),
        );
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
  const { practiceByPattern, regularB } = practiceOf(readable);
  let planned = false;
  for (const [pattern, records] of byPattern) {
    // 読める練習が無くなったパターンは新しい段を積まない。
    if (!practiceByPattern.has(pattern)) continue;
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
    // 次の段は最後の段 (step の順) から決まる。積むときにその段がまだ同じ状態かを確かめる。
    const last = records.reduce((a, b) => (b.step > a.step ? b : a));
    if (slot) {
      await insertSlot(db, scope, pattern, slot, now, { step: last.step, status: last.status });
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
      assisted: await firstPassAssisted(db, scope, reached.decidingTaskId, reached.decidingHash),
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
  const { practiceByPattern } = practiceOf(readable);
  const due = rows
    .filter(
      (r) =>
        (r.status === "scheduled" || r.status === "out-of-stock") &&
        r.dueOn <= today &&
        practiceByPattern.has(r.pattern),
    )
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
  // 開いた出題が 2 つあるのは、合格を覆して戻した出題があるときだけ。先に出した方 (戻した出題) を返す。
  const current =
    rows
      .filter((r) => r.status === "issued")
      .sort((a, b) => (a.issuedAt?.getTime() ?? 0) - (b.issuedAt?.getTime() ?? 0))[0] ??
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
    reopened: current.status === "issued" && current.reopenedAt !== null,
  };
}

/**
 * 人が類題の合格を覆したとき (#39): 出題の記録を「出した」に戻す文。合格・支援付きかの記録を消し、
 * 戻したことを `reopened_at` に残す。受講者は同じ類題をやり直す (配布・提出の経路はそのまま)。
 * 判定と同じ batch で書けるよう、文だけを返す (戻す記録が無ければ、どの文も何も変えない)。
 *
 * - そのパターンの次の出題がまだ出ていない (積んだ・在庫切れ) なら取り消す。覆した合格の日付と
 *   支援から積んだ出題なので、やり直して合格したあと今日の類題を開いた時点で積み直す。
 * - 次の類題をもう出していれば、それは残す (受講者が取り組んでいる・合格した類題を消さない)。
 *   同じパターンの別の問題なので、覆した類題と同じ確かめにもなる。
 * - 同じ類題のほかの提出の合格が残っていても戻す。今日の類題を開いたときに、残った合格から
 *   合格の日付と支援付きかを付け直す (`syncIssued` が今の版の最初の合格で判定する)。
 * - 戻した出題が開いている間は、新しい類題を出さない (`issueDue`)。
 *
 * 出したまま (合格を記録に写す前) の出題は、進捗が合格でなくなればそのままでよいので何もしない。
 */
export async function reopenVariantStatements(
  db: Db,
  row: { tenantId: string; studentId: string; taskId: string },
  now: Date,
): Promise<BatchItem<"sqlite">[]> {
  const scope = { tenantId: row.tenantId, userId: row.studentId };
  // 読んでから書く形にしない。今日の類題を開いた要求が同時に合格を写す・次の出題を積むので、
  // batch を書く時点の記録に条件で当てる (合格を写すのが先なら戻し、後なら写す側が進捗を見て止まる)。
  const revoked = alias(variantReviews, "revoked");
  const issuedLater = alias(variantReviews, "issued_later");
  const ownOf = (table: typeof variantReviews | typeof revoked | typeof issuedLater) =>
    and(eq(table.tenantId, scope.tenantId), eq(table.userId, scope.userId));
  /** 覆した類題の合格の記録より後の、同じパターンの段か。 */
  const afterRevoked = (table: typeof variantReviews | typeof issuedLater) =>
    exists(
      db
        .select({ id: revoked.id })
        .from(revoked)
        .where(
          and(
            ownOf(revoked),
            eq(revoked.variantTaskId, row.taskId),
            eq(revoked.status, "passed"),
            eq(revoked.pattern, table.pattern),
            lt(revoked.step, table.step),
          ),
        ),
    );
  const pending = ["scheduled", "out-of-stock"] as const;
  return [
    // まだ出していない後の段を消す。次の類題をもう出していれば (積んだ・在庫切れ以外の後の段が
    // ある)、後の段は 1 つも消さない。合格を戻す前に消す (後の段は合格の記録を条件に探す)。
    db.delete(variantReviews).where(
      and(
        ownOf(variantReviews),
        inArray(variantReviews.status, [...pending]),
        afterRevoked(variantReviews),
        notExists(
          db
            .select({ id: issuedLater.id })
            .from(issuedLater)
            .where(
              and(
                ownOf(issuedLater),
                eq(issuedLater.pattern, variantReviews.pattern),
                notInArray(issuedLater.status, [...pending]),
                afterRevoked(issuedLater),
              ),
            ),
        ),
      ),
    ),
    db
      .update(variantReviews)
      .set({
        status: "issued",
        passedAt: null,
        passedAssisted: null,
        reopenedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          ownOf(variantReviews),
          eq(variantReviews.variantTaskId, row.taskId),
          eq(variantReviews.status, "passed"),
        ),
      ),
  ];
}

/**
 * 時間を空けた類題の自力の合格で「時間を空けて確認」にできるスキル (#39)。出題の目的が時間を
 * 空けた類題 (3 日後・1 週間後・3 週間後) で、提出が出題のあとのときだけ。確認Bの定着
 * (`retentionBasis`) と同じく、出題より前に同じパターンの課題に支援なしで合格した証拠がある
 * スキルに限る (後日の別問題でも適用できた、03 §7)。証拠は出題の時点で確定していたもの
 * (証拠の作成も出題より前) に限る。当たらなければ null。
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
        // 出題の時点で確定していた証拠だけ。出題より前の提出でも、判定が出題のあとなら使わない。
        lt(submissions.submittedAt, review.issuedAt),
        lt(skillEvidence.createdAt, review.issuedAt),
      ),
    );
  return new Set(evidence.map((e) => e.skillId));
}

/**
 * 講師・管理者向け: パターンごとの類題の在庫と、在庫切れで待っている受講者 (#39)。
 * テナントの講座の課題があるパターンと、在庫切れの出題があるパターンを並べ、待っている
 * 受講者のいるパターンを先にする。出題の記録がある受講者ごとに、まだ出していない類題の数も
 * 数え、いちばん少ない人の残りを返す (在庫が近く尽きるかを見るため)。未見の残りは、その受講者に
 * 出せる類題 (受講者が読めるステージのもの) だけで数え、今は出題されない受講者 (そのパターンの
 * 読める練習が無い) は受講者・未見の残り・待っている受講者に数えない。
 */
export async function loadVariantStock(db: Db, caller: Caller): Promise<VariantStockSummary[]> {
  const [taskRows, records, readable, waiting] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        order: tasks.order,
        pattern: tasks.pattern,
        kind: tasks.kind,
        variantOf: tasks.variantOf,
        stageId: stages.id,
        stageTitle: stages.title,
        published: eq(stages.status, "published"),
      })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(eq(stages.tenantId, caller.tenantId), eq(stages.format, 2), eq(tasks.active, true)),
      )
      .orderBy(asc(stages.title), asc(sections.order), asc(tasks.order)),
    db
      .select({
        userId: variantReviews.userId,
        pattern: variantReviews.pattern,
        variantTaskId: variantReviews.variantTaskId,
      })
      .from(variantReviews)
      .where(eq(variantReviews.tenantId, caller.tenantId)),
    db
      .select({ userId: enrollments.userId, stageId: enrollments.stageId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.tenantId, caller.tenantId),
          inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
        ),
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
      s = {
        pattern,
        practiceTitles: [],
        stageTitles: [],
        stock: { remedial: 0, check: 0 },
        learners: 0,
        fewestUnseen: null,
        waiting: [],
      };
      summaries.set(pattern, s);
    }
    return s;
  };
  // パターンごとの類題 (補習・確認用に分けた ID)。
  const variantsByPattern = new Map<string, { remedial: string[]; check: string[] }>();
  // 受講者に出せる類題は、受講者が読めるステージ (公開中で、受講中か修了) のものだけ
  // (`issueDue` が選ぶ在庫と同じ)。未見の残りもその範囲で数える。
  const publishedStageOf = new Map<string, string>();
  // パターンの練習 (類題でも確認Bでもない、公開中のステージの課題) があるステージ。読める練習が
  // 無い受講者には、`issueDue` は出題しない (教材から外れた・受講をやめた) ので、受講者の数・
  // 未見の残り・待っている受講者に数えない (足しても出ない受講者で見立てを止めない)。
  const practiceStagesOf = new Map<string, Set<string>>();
  const readableStages = new Map<string, Set<string>>();
  for (const e of readable) {
    const stagesOfUser = readableStages.get(e.userId) ?? new Set<string>();
    readableStages.set(e.userId, stagesOfUser);
    stagesOfUser.add(e.stageId);
  }
  for (const task of taskRows) {
    const s = summaryOf(task.pattern);
    if (!s.stageTitles.includes(task.stageTitle)) s.stageTitles.push(task.stageTitle);
    if (task.variantOf === null) {
      // 通常の確認Bは起点のあとに解く後日の確認なので、練習に数えない (`practiceOf` と同じ)。
      if (task.kind !== "assessment-b") {
        s.practiceTitles.push(task.title);
        if (task.published) {
          const practiceStages = practiceStagesOf.get(task.pattern) ?? new Set<string>();
          practiceStagesOf.set(task.pattern, practiceStages);
          practiceStages.add(task.stageId);
        }
      }
      continue;
    }
    if (task.published) publishedStageOf.set(task.id, task.stageId);
    const kind = task.kind as TaskKind;
    const ids = variantsByPattern.get(task.pattern) ?? { remedial: [], check: [] };
    variantsByPattern.set(task.pattern, ids);
    if (REMEDIAL_VARIANT_KINDS.includes(kind)) ids.remedial.push(task.id);
    else if (CHECK_VARIANT_KINDS.includes(kind)) ids.check.push(task.id);
  }
  for (const [pattern, ids] of variantsByPattern)
    summaryOf(pattern).stock = { remedial: ids.remedial.length, check: ids.check.length };
  const servable = (userId: string, pattern: string) => {
    const stagesOfUser = readableStages.get(userId);
    const practiceStages = practiceStagesOf.get(pattern);
    return [...(practiceStages ?? [])].some((stageId) => stagesOfUser?.has(stageId) === true);
  };
  // 受講者ごとに出した類題 (取り下げた出題も、出した類題は「見た」ものとして数える)。
  const seenByPattern = new Map<string, Map<string, Set<string>>>();
  for (const record of records) {
    if (!servable(record.userId, record.pattern)) continue;
    const byUser = seenByPattern.get(record.pattern) ?? new Map<string, Set<string>>();
    seenByPattern.set(record.pattern, byUser);
    const seen = byUser.get(record.userId) ?? new Set<string>();
    byUser.set(record.userId, seen);
    if (record.variantTaskId) seen.add(record.variantTaskId);
  }
  for (const [pattern, byUser] of seenByPattern) {
    const s = summaryOf(pattern);
    const ids = variantsByPattern.get(pattern) ?? { remedial: [], check: [] };
    s.learners = byUser.size;
    for (const [userId, seen] of byUser) {
      const stagesOfUser = readableStages.get(userId);
      const available = (id: string) => {
        const stageId = publishedStageOf.get(id);
        return stageId !== undefined && stagesOfUser?.has(stageId) === true && !seen.has(id);
      };
      const unseen = {
        remedial: ids.remedial.filter(available).length,
        check: ids.check.filter(available).length,
      };
      s.fewestUnseen = s.fewestUnseen
        ? {
            remedial: Math.min(s.fewestUnseen.remedial, unseen.remedial),
            check: Math.min(s.fewestUnseen.check, unseen.check),
          }
        : unseen;
    }
  }
  for (const { pattern, ...w } of waiting)
    if (servable(w.userId, pattern)) summaryOf(pattern).waiting.push(w);
  return [...summaries.values()].sort(
    (a, b) =>
      Number(b.waiting.length > 0) - Number(a.waiting.length > 0) ||
      a.pattern.localeCompare(b.pattern),
  );
}
