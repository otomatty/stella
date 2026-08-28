/**
 * 「次にやるリスト」(ステージのキュー) の CRUD (Phase 2)。
 *
 *   GET    /api/stage-queue/mine            … 並び順どおりの一覧
 *   POST   /api/stage-queue/mine            … 末尾に追加 (二重追加は無視)
 *   DELETE /api/stage-queue/mine/:stageId   … 取り消し
 *   PUT    /api/stage-queue/mine/order      … 並べ替え
 *
 * ## 決めたこと
 *
 * **本人ぶんだけ。** パスに他人を指す余地を作らない (`/mine` 固定)。staff にも
 * 他人のキューを読む口は開けない — 学習の正本ではなく本人のメモなので、
 * モニタリングの材料にすると「見られている前提で並べる」ことになる。
 *
 * **受講登録のあるステージだけ。** 割り当てられていない星を積めると、順番待ちの
 * リストに永遠に着手できない行が残る。存在しない id と未受講の id は同じ 400 に
 * 丸める (他人の割当や未公開ステージの有無を応答から探れないように)。
 *
 * **`order` は 0 から詰めた連番。** 追加は末尾、削除と並べ替えのあとは必ず振り直す。
 * 歯抜けを許すと「末尾」の意味が場所ごとにぶれる。
 */

import { Hono } from "hono";

import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import type { Caller } from "../lib/authz.js";
import {
  deleteStageQueueEntry,
  insertStageQueueEntry,
  isEnrolledInStage,
  loadStageQueue,
  setStageQueueOrder,
  type StageQueueEntry,
} from "../lib/stage-queue-data.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const stageQueueRoute = new Hono<{ Bindings: Env }>();

/**
 * 1 人が積めるキューの上限。並べ替えが現実的に手に負える長さで頭打ちにする。
 *
 * **判定は「読んでから書く」ので隙間がある** — 同時に 2 回押されると上限を 1〜2 件
 * 超えて入りうる (一意索引が守るのは二重追加だけで、件数は守らない)。ここは
 * 本人のメモであって権限でも課金でもないので、隙間を閉じるための追加のロックや
 * 集計制約は割に合わないと判断した。超えても次の削除で自然に戻る。
 */
const MAX_QUEUE = 20;

function toPayload(
  rows: StageQueueEntry[],
): { stage_id: string; order: number; added_at: string }[] {
  return rows.map((row, i) => ({
    stage_id: row.stageId,
    // 保存値が歯抜けでも、応答は必ず 0..n-1 の連番で返す (画面が index を信用できる)。
    order: i,
    added_at: row.addedAt.toISOString(),
  }));
}

/** 抜けたぶんを詰めて、詰めたあとの一覧を返す。 */
async function compact(db: Db, caller: Caller): Promise<StageQueueEntry[]> {
  const rest = await loadStageQueue(db, caller);
  await setStageQueueOrder(
    db,
    caller,
    rest.map((row) => row.stageId),
  );
  return rest;
}

stageQueueRoute.get("/api/stage-queue/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    return c.json({ stage_queue: toPayload(await loadStageQueue(db, caller)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

stageQueueRoute.post("/api/stage-queue/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    type Body = { stageId?: unknown; stage_id?: unknown };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);
    const stageId = body.stageId ?? body.stage_id;
    if (typeof stageId !== "string" || stageId === "") {
      throw new ApiError("stageId が必要です", 400);
    }
    if (!(await isEnrolledInStage(db, caller, stageId))) {
      throw new ApiError("受講登録のないステージはキューに追加できません", 400);
    }

    const current = await loadStageQueue(db, caller);
    // 二重追加は成功扱いで現状を返す (連打やタブ 2 枚でエラーにしない)。
    if (!current.some((row) => row.stageId === stageId)) {
      if (current.length >= MAX_QUEUE) {
        throw new ApiError(`キューに追加できるのは ${MAX_QUEUE} 件までです`, 400);
      }
      await insertStageQueueEntry(db, caller, stageId, current.length);
    }
    return c.json({ stage_queue: toPayload(await loadStageQueue(db, caller)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

stageQueueRoute.delete("/api/stage-queue/mine/:stageId", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    await deleteStageQueueEntry(db, caller, c.req.param("stageId"));
    return c.json({ stage_queue: toPayload(await compact(db, caller)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

stageQueueRoute.put("/api/stage-queue/mine/order", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    type Body = { stageIds?: unknown; stage_ids?: unknown };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);
    const raw = body.stageIds ?? body.stage_ids;
    if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
      throw new ApiError("stageIds (文字列の配列) が必要です", 400);
    }
    const requested = [...new Set(raw as string[])];

    const current = await loadStageQueue(db, caller);
    const known = new Set(current.map((row) => row.stageId));
    if (requested.some((id) => !known.has(id))) {
      throw new ApiError("キューに無いステージは並べ替えられません", 400);
    }
    // 別タブで追加された行が payload に無いことはある。落とさず末尾に残す
    // (並べ替えのたびに知らない行が消えると、追加と並べ替えの競合で行が失われる)。
    const tail = current.map((row) => row.stageId).filter((id) => !requested.includes(id));
    await setStageQueueOrder(db, caller, [...requested, ...tail]);
    return c.json({ stage_queue: toPayload(await loadStageQueue(db, caller)) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * フォーカスを切り替えたステージをキューから外す (着手した行は待ち行列に残さない)。
 *
 * **キューに無いステージなら何も書かない。** フォーカスの切り替えは毎回ここを通るが、
 * 積んでいない星に乗り換えるのがむしろ普通なので、そのたびに全行の `order` を
 * 書き直すのは無駄 (詰め直す隙間がそもそも空いていない)。
 */
export async function dropFromQueue(db: Db, caller: Caller, stageId: string): Promise<void> {
  const current = await loadStageQueue(db, caller);
  if (!current.some((row) => row.stageId === stageId)) return;
  await deleteStageQueueEntry(db, caller, stageId);
  // 残りの並びは読み直さなくても分かる (今読んだ一覧から 1 件抜くだけ)。
  await setStageQueueOrder(
    db,
    caller,
    current.filter((row) => row.stageId !== stageId).map((row) => row.stageId),
  );
}
