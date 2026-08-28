/**
 * 学習経路の記録 (`stage_path_events`) の書き込み (Phase 1)。
 *
 * 「どの星をいつ点けたか」を後から集計するための追記ログで、**進捗の正本ではない**
 * (正本は `enrollments` / `certificates`)。したがって:
 *
 *   - 失敗しても呼び出し側に投げ返さない。統計が 1 件欠けるより、割当や修了証の発行が
 *     500 で止まる方が害が大きい。ログだけ残して黙って続ける
 *   - 同じ (user, stage, event) は 1 件だけ積む。連打や再開で `started` が増殖すると、
 *     「何人が始めたか」も「開始からクリアまでの間隔」も歪む
 *
 * 重複の抑止は **DB の一意索引 + `insert ... on conflict do nothing`** に任せる (0034)。
 * 以前は「既存を SELECT して差分だけ INSERT」していたが、
 *   - 読みと書きの隙に同じ組が入ると二重に積まれる (自己開始と修了確定が並ぶ)
 *   - 既存を引く SELECT が user × stage の直積になり、人数が増えるとバインド上限を超える
 * の 2 つが残っていた。索引に倒すとどちらも消え、往復も 1 回減る。
 */

import type { Db } from "../db/client.js";
import { stagePathEvents } from "../db/schema.js";
import { D1_MAX_BOUND_PARAMS, chunk } from "./enrollment-bulk.js";

export type StagePathEvent = "started" | "cleared";

/** 記録する 1 件。 */
export interface StagePathPair {
  userId: string;
  stageId: string;
}

/**
 * 1 文に載せる行数。1 行 = 5 列 + `id` の既定値で 6 バインド。
 *
 * 固定のオーバーヘッドは無い (`do nothing` は値を持たない) ので、上限をそのまま割る。
 */
const ROWS_PER_INSERT = Math.max(1, Math.floor(D1_MAX_BOUND_PARAMS / 6));

/**
 * `(userId, stageId)` の組に `event` を記録する。既に同じ組の同じ event があれば足さない。
 *
 * **例外を投げない。** 呼び出し側は `await` するだけでよく、try/catch は要らない。
 */
export async function recordStagePathEvents(
  db: Db,
  tenantId: string,
  event: StagePathEvent,
  pairs: StagePathPair[],
): Promise<void> {
  try {
    // バッチ内の重複はここで畳む。同じ文の中で同じ組が 2 回出ると、SQLite は
    // `on conflict do nothing` でも「1 文の中の重複」までは面倒を見ない。
    // キーの区切りは NUL の **エスケープ表記** (\u0000) で書く。生の 0x00 をソースに
    // 埋めると git がファイルごとバイナリ扱いし、diff もレビューもできなくなる。
    const unique = new Map<string, StagePathPair>();
    for (const pair of pairs) {
      if (!pair.userId || !pair.stageId) continue;
      unique.set(`${pair.userId}\u0000${pair.stageId}`, pair);
    }
    if (unique.size === 0) return;

    const at = new Date();
    const values = [...unique.values()].map((pair) => ({
      tenantId,
      userId: pair.userId,
      stageId: pair.stageId,
      event,
      at,
    }));

    for (const rows of chunk(values, ROWS_PER_INSERT)) {
      // 衝突先は 0034 の一意索引 (user_id, stage_id, event)。既にある組は黙って捨てる。
      await db.insert(stagePathEvents).values(rows).onConflictDoNothing();
    }
  } catch (e) {
    console.error(`[stage-path] ${event} の記録に失敗 (学習フローは継続)`, e);
  }
}
