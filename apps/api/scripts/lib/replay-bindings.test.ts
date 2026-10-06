import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getDb } from "../../src/db/client.js";
import { tenants } from "../../src/db/schema.js";
import type { Env } from "../../src/env.js";
import { sqliteD1 } from "../../src/testing/sqlite-d1.js";
import { EVAL_SOURCE_SQL } from "./ai-review-eval.js";
import {
  isReadOnlySql,
  parseR2BucketName,
  pickDatabaseId,
  readOnlyBucket,
  readOnlyD1,
  replayWranglerConfig,
} from "./replay-bindings.js";

describe("リプレイは D1 と R2 を読むだけ", () => {
  it("読み取りの文だけを通す", () => {
    expect(isReadOnlySql('select "id" from "submissions" where "id" = ? limit ?')).toBe(true);
    expect(isReadOnlySql(EVAL_SOURCE_SQL)).toBe(true);
    // 識別子や文字列の中の語は見ない。
    expect(isReadOnlySql(`select "updated_at", 'delete' from "replace"`)).toBe(true);
    for (const sql of [
      "insert into tenants (id) values ('x')",
      'update "submissions" set "verdict" = ?',
      "delete from ai_reviews",
      "with x as (select 1) delete from ai_reviews",
      "select 1; drop table ai_reviews",
      "pragma foreign_keys = off",
      "replace into tenants (id, name) values ('x', 'y')",
    ])
      expect(isReadOnlySql(sql), sql).toBe(false);
  });

  it("drizzle の読み取りは通し、書き込みは D1 に届く前に止める", async () => {
    const database = sqliteD1();
    try {
      await getDb({ DB: database.binding } as unknown as Env)
        .insert(tenants)
        .values({ id: "ses", name: "テスト" });
      const db = getDb({ DB: readOnlyD1(database.binding) } as unknown as Env);
      expect(await db.select().from(tenants)).toMatchObject([{ id: "ses" }]);
      await expect(db.insert(tenants).values({ id: "x", name: "x" })).rejects.toThrow("読むだけ");
      await expect(db.delete(tenants)).rejects.toThrow("読むだけ");
      expect(await db.select().from(tenants)).toHaveLength(1);
    } finally {
      database.sqlite.close();
    }
  });

  it("R2 は get と head しか持たない", async () => {
    const bucket = {
      get: vi.fn(async () => null),
      head: vi.fn(async () => null),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const guarded = readOnlyBucket(bucket as unknown as R2Bucket) as unknown as Record<
      string,
      unknown
    >;
    expect(Object.keys(guarded).sort()).toEqual(["get", "head"]);
    await (guarded.get as (key: string) => Promise<unknown>)("k");
    expect(bucket.get).toHaveBeenCalledWith("k");
  });

  it("getPlatformProxy に渡す設定は DB と提出のバケットだけ。リモートの DB は名前で引く", () => {
    const toml = readFileSync(join(import.meta.dirname, "../../wrangler.toml"), "utf8");
    expect(parseR2BucketName(toml, "SUBMISSIONS_BUCKET")).toBe("stella-submissions");
    expect(() => parseR2BucketName(toml, "NOPE")).toThrow("NOPE");
    const config = replayWranglerConfig({
      remote: true,
      accountId: "acc",
      databaseId: "db-id",
      bucketName: "stella-submissions",
    });
    expect(config.d1_databases).toEqual([
      { binding: "DB", database_name: "stella-db", database_id: "db-id", remote: true },
    ]);
    expect(config.r2_buckets).toEqual([
      { binding: "SUBMISSIONS_BUCKET", bucket_name: "stella-submissions", remote: true },
    ]);
    expect(Object.keys(config)).not.toContain("vars");
    const listed = `▲ [WARNING] Proxy environment variables detected.\n${JSON.stringify([
      { name: "other", uuid: "1" },
      { name: "stella-db", uuid: "2" },
    ])}`;
    expect(pickDatabaseId(listed, "stella-db")).toBe("2");
    expect(() => pickDatabaseId("[]", "stella-db")).toThrow("見つかりません");
  });
});
