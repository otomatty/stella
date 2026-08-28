/**
 * 学習経路の記録 (`stage_path_events`) の書き込み。
 *
 * 見ているのは「重複を積まない」「バインド上限を割らない」「失敗しても投げない」の 3 点。
 * 重複の抑止そのものは DB の一意索引 (0034) が持つので、ここではアプリ側が
 * `on conflict do nothing` を付けてバッチ内の重複も畳んでいることを確かめる。
 */

import { describe, expect, it, vi } from "vitest";

import type { Db } from "../db/client.js";
import { D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";
import { recordStagePathEvents } from "./stage-path-events.js";

interface Recorded {
  rows: Record<string, unknown>[];
  conflictHandled: boolean;
}

function createDb(onInsert?: () => void) {
  const inserts: Recorded[] = [];
  const selects: string[] = [];
  const db = {
    select: (shape?: Record<string, unknown>) => {
      selects.push(Object.keys(shape ?? {}).join(","));
      const chain: Record<string, unknown> = {};
      chain.from = () => chain;
      chain.where = () => chain;
      // biome-ignore lint/suspicious/noThenProperty: drizzle のクエリは意図的に thenable
      chain.then = (onFulfilled: (v: unknown[]) => unknown) =>
        Promise.resolve([]).then(onFulfilled);
      return chain;
    },
    insert: () => ({
      values: (rows: Record<string, unknown>[]) => {
        onInsert?.();
        const recorded: Recorded = { rows, conflictHandled: false };
        inserts.push(recorded);
        return {
          onConflictDoNothing: async () => {
            recorded.conflictHandled = true;
            return [];
          },
          // biome-ignore lint/suspicious/noThenProperty: `on conflict` を付け忘れたら気付けるように
          then: (onFulfilled: (v: unknown[]) => unknown) => Promise.resolve([]).then(onFulfilled),
        };
      },
    }),
  };
  return { db: db as unknown as Db, inserts, selects };
}

const pairs = (n: number, prefix = "u") =>
  Array.from({ length: n }, (_, i) => ({ userId: `${prefix}${i}`, stageId: "stage-1" }));

describe("recordStagePathEvents", () => {
  it("insert + on conflict do nothing で積む (読んでから書かない)", async () => {
    const { db, inserts, selects } = createDb();
    await recordStagePathEvents(db, "ses", "started", [{ userId: "u1", stageId: "s1" }]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.rows).toEqual([
      { tenantId: "ses", userId: "u1", stageId: "s1", event: "started", at: expect.any(Date) },
    ]);
    expect(inserts[0]?.conflictHandled).toBe(true);
    // 既存を引く SELECT は無い (往復が減り、読みと書きの隙も無くなる)。
    expect(selects).toEqual([]);
  });

  it("同じ組が何度渡されても 1 行しか積まない", async () => {
    const { db, inserts } = createDb();
    await recordStagePathEvents(db, "ses", "cleared", [
      { userId: "u1", stageId: "s1" },
      { userId: "u1", stageId: "s1" },
      { userId: "u1", stageId: "s2" },
    ]);
    expect(inserts.flatMap((i) => i.rows)).toHaveLength(2);
  });

  it("空の組は捨てる (1 件も残らなければ insert もしない)", async () => {
    const { db, inserts } = createDb();
    await recordStagePathEvents(db, "ses", "started", [
      { userId: "", stageId: "s1" },
      { userId: "u1", stageId: "" },
    ]);
    expect(inserts).toEqual([]);
  });

  it("大量の組でも 1 文のバインドが D1 の上限を超えない", async () => {
    // 98 人 (旧実装が既存引きの直積でバインド上限を割った件数) を含めて確かめる。
    for (const n of [98, 100, 250]) {
      const { db, inserts } = createDb();
      await recordStagePathEvents(db, "ses", "started", pairs(n));
      expect(inserts.flatMap((i) => i.rows)).toHaveLength(n);
      for (const insert of inserts) {
        // 1 行 5 列 + id の既定値で 6 バインド。
        expect(insert.rows.length * 6).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
        expect(insert.conflictHandled).toBe(true);
      }
    }
  });

  it("書き込みが落ちても投げない (学習フローを止めない)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {
      // 握り潰す。
    });
    const { db } = createDb(() => {
      throw new Error("D1 down");
    });
    await expect(
      recordStagePathEvents(db, "ses", "started", [{ userId: "u1", stageId: "s1" }]),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
