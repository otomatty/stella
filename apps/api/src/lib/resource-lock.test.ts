/**
 * Issue #237 — 排他ロック。 本文 (D1) と読み上げ音声 (R2) を食い違わせないために、
 * 同じ質問への操作をこれで直列化する。
 */

import { describe, expect, it, vi } from "vitest";

import type { Db } from "../db/client.js";
import { interviewQuestionLockId, withResourceLock } from "./resource-lock.js";

/**
 * `insert ... on conflict do nothing` の性質だけを持つ最小の D1 代役。
 * 実 SQLite での挙動 (競合時は returning が空) はこの前提のとおり。
 */
function createLockDb(initial: Map<string, { holder: string; expiresAt: number }> = new Map()) {
  const rows = initial;
  const db = {
    rows,
    now: 1_700_000_000_000,
    /** 直近に取得できた holder。 解放条件 (id + holder) の代わりに使う。 */
    lastHolder: null as string | null,
    delete: () => ({
      where: async () => {
        // 本番の delete は 2 通り —— 期限切れの掃除と、 自分が取った分の解放。
        // where 句は読めないので、 その 2 つをまとめて再現する。
        for (const [id, row] of [...rows]) {
          if (row.expiresAt <= db.now) rows.delete(id);
          else if (db.lastHolder !== null && row.holder === db.lastHolder) rows.delete(id);
        }
        return [];
      },
    }),
    insert: () => ({
      values: (v: { id: string; holder: string; expiresAt: Date }) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (rows.has(v.id)) return [];
            rows.set(v.id, { holder: v.holder, expiresAt: v.expiresAt.getTime() });
            db.lastHolder = v.holder;
            return [{ id: v.id }];
          },
        }),
      }),
    }),
  };
  return db;
}

const asDb = (db: unknown) => db as unknown as Db;

describe("withResourceLock", () => {
  it("空いていれば実行して、 終わったら解放する", async () => {
    const db = createLockDb();
    const fn = vi.fn(async () => "done");

    const result = await withResourceLock(asDb(db), "lock-a", fn, { now: () => db.now });

    expect(result).toEqual({ ran: true, value: "done" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(db.rows.has("lock-a")).toBe(false);
  });

  it("他が保持していたら待って、 諦めたら実行しない", async () => {
    const db = createLockDb(
      new Map([["lock-a", { holder: "other", expiresAt: 1_700_000_060_000 }]]),
    );
    const fn = vi.fn();

    const result = await withResourceLock(asDb(db), "lock-a", fn, {
      now: () => db.now,
      waitMs: 0,
    });

    expect(result).toEqual({ ran: false });
    // 取れなかったのだから、 保護対象には一切触らせない。
    expect(fn).not.toHaveBeenCalled();
    // 他人のロックを奪ったり消したりしない。
    expect(db.rows.get("lock-a")?.holder).toBe("other");
  });

  it("期限切れのロックは取り直せる (保持者が落ちても詰まらない)", async () => {
    const db = createLockDb(
      new Map([["lock-a", { holder: "dead", expiresAt: 1_699_999_000_000 }]]),
    );

    const result = await withResourceLock(asDb(db), "lock-a", async () => "ok", {
      now: () => db.now,
      waitMs: 0,
    });

    expect(result).toEqual({ ran: true, value: "ok" });
  });

  it("実行中に例外が出ても解放する", async () => {
    const db = createLockDb();

    await expect(
      withResourceLock(
        asDb(db),
        "lock-a",
        async () => {
          throw new Error("boom");
        },
        { now: () => db.now },
      ),
    ).rejects.toThrow("boom");

    expect(db.rows.has("lock-a")).toBe(false);
  });
});

describe("interviewQuestionLockId", () => {
  it("テナントと質問番号でロックを分ける (別テナント・別問は待たせない)", () => {
    expect(interviewQuestionLockId("ses", 101)).toBe("interview-question:ses:101");
    expect(interviewQuestionLockId("ses", 101)).not.toBe(interviewQuestionLockId("ses", 102));
    expect(interviewQuestionLockId("ses", 101)).not.toBe(interviewQuestionLockId("other", 101));
  });
});
