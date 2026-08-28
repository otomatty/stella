/**
 * 「次にやるリスト」(ステージのキュー) の D1 読み書き (Phase 2)。
 *
 * ルート (`routes/stage-queue.ts`) は並びの決め方 (末尾に足す / 詰め直す / 知らない
 * 行を落とさない) だけを持ち、SQL はここに閉じる。skill-map と同じ切り方で、
 * route テストはこのモジュールを差し替えて API 境界の責務だけを見る。
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { READABLE_ENROLLMENT_STATUSES } from "@falcon/shared/enrollment/access";

import type { Db } from "../db/client.js";
import { enrollments, stageQueue } from "../db/schema.js";
import type { Caller } from "./authz.js";

export interface StageQueueEntry {
  stageId: string;
  order: number;
  addedAt: Date;
}

/** 本人のキューを並び順で読む。 */
export async function loadStageQueue(db: Db, caller: Caller): Promise<StageQueueEntry[]> {
  return db
    .select({ stageId: stageQueue.stageId, order: stageQueue.order, addedAt: stageQueue.addedAt })
    .from(stageQueue)
    .where(eq(stageQueue.userId, caller.id))
    .orderBy(asc(stageQueue.order), asc(stageQueue.addedAt));
}

/**
 * 末尾に 1 件足す。
 *
 * 一意索引 (`stage_queue_user_stage_uq`) が二重追加の本当の防波堤 — 「読んでから
 * 書く」だけでは、同時に 2 回押されたときの隙が閉じない。
 */
export async function insertStageQueueEntry(
  db: Db,
  caller: Caller,
  stageId: string,
  order: number,
): Promise<void> {
  await db
    .insert(stageQueue)
    .values({
      tenantId: caller.tenantId,
      userId: caller.id,
      stageId,
      order,
      addedAt: new Date(),
    })
    .onConflictDoNothing();
}

/** 1 件外す (無ければ何もしない)。 */
export async function deleteStageQueueEntry(
  db: Db,
  caller: Caller,
  stageId: string,
): Promise<void> {
  await db
    .delete(stageQueue)
    .where(and(eq(stageQueue.userId, caller.id), eq(stageQueue.stageId, stageId)));
}

/**
 * 与えられた並びで `order` を 0..n-1 に振り直す。
 *
 * **1 文ずつ await せず `db.batch()` にまとめる。** 20 件のキューを並べ替えるたびに
 * 20 往復すると、Workers の 1 実行あたりのクエリ数 (D1 の上限) を無駄に食う。
 * batch なら 1 往復で、しかも D1 側で 1 トランザクションになるので、途中で落ちて
 * 順番が半分だけ入れ替わった状態も残らない。
 */
export async function setStageQueueOrder(
  db: Db,
  caller: Caller,
  stageIds: readonly string[],
): Promise<void> {
  const statements = stageIds.map((stageId, i) =>
    db
      .update(stageQueue)
      .set({ order: i })
      .where(and(eq(stageQueue.userId, caller.id), eq(stageQueue.stageId, stageId))),
  );
  const [first, ...rest] = statements;
  // batch は 1 文以上を要求する (空の並べ替えはそもそも何もしない)。
  if (!first) return;
  await db.batch([first, ...rest]);
}

/**
 * 「今すぐ中身を開ける」受講登録があるか (キューに積めるのは割り当てられた星だけ)。
 *
 * 絞り込みは `loadEnrolledStageIds` と同じ規約 (`READABLE_ENROLLMENT_STATUSES` +
 * テナント)。`expired` を通すと、期限切れで開けない星が順番待ちに残る。
 */
export async function isEnrolledInStage(db: Db, caller: Caller, stageId: string): Promise<boolean> {
  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.tenantId, caller.tenantId),
        eq(enrollments.stageId, stageId),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
