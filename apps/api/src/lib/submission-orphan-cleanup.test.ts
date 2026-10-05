import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { resourceLocks, submissionFiles, submissions, tenants } from "../db/schema.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { runSubmissionOrphanCleanup } from "./submission-orphan-cleanup.js";

const NOW = new Date("2026-10-05T00:00:00Z");
const OLD = new Date("2026-10-03T00:00:00Z");
const CURSOR_KEY = "maintenance/submission-orphans.json";

describe("提出ファイルの孤立オブジェクト回収 (実SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let db: ReturnType<typeof getDb>;
  let env: Env;
  let objects: Map<string, { key: string; uploaded: Date; body: string; size: number }>;
  beforeEach(async () => {
    database = sqliteD1();
    objects = new Map();
    env = {
      DB: database.binding,
      SUBMISSIONS_BUCKET: {
        get: vi.fn(async (key: string) => {
          const object = objects.get(key);
          return object ? { json: async () => JSON.parse(object.body) as unknown } : null;
        }),
        put: vi.fn(async (key: string, body: string) => {
          objects.set(key, { key, uploaded: NOW, body, size: body.length });
        }),
        list: vi.fn(async (options: R2ListOptions = {}) => {
          const keys = [...objects.keys()]
            .filter((key) => key.startsWith(options.prefix ?? "") && key > (options.cursor ?? ""))
            .sort();
          const page = keys.slice(0, options.limit ?? 1000);
          const truncated = page.length < keys.length;
          return {
            objects: page.map((key) => objects.get(key)),
            truncated,
            ...(truncated ? { cursor: page.at(-1) } : {}),
          };
        }),
        delete: vi.fn(async (keys: string | string[]) => {
          for (const key of typeof keys === "string" ? [keys] : keys) objects.delete(key);
        }),
      },
    } as unknown as Env;
    db = getDb(env);
    await db.insert(tenants).values({ id: "ses", name: "テスト" });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    database.sqlite.close();
  });
  function object(key: string, uploaded = OLD) {
    objects.set(key, { key, uploaded, body: "code", size: 4 });
    return key;
  }
  function orphan(uploaded = OLD) {
    return object(`submissions/ses/${crypto.randomUUID()}/0`, uploaded);
  }
  async function referenced(uploaded = OLD) {
    const id = crypto.randomUUID();
    const key = object(`submissions/ses/${id}/0`, uploaded);
    await db.batch([
      db.insert(submissions).values({
        id,
        tenantId: "ses",
        stageTitle: "ステージ",
        assignmentTitle: "課題",
        code: "",
      }),
      db.insert(submissionFiles).values({
        submissionId: id,
        path: "index.html",
        objectKey: key,
        sha256: "a".repeat(64),
        bytes: 4,
      }),
    ]);
    return key;
  }
  it("参照中・保存途中・未知のキーを残し、24時間を超えた孤立ファイルだけを削除する", async () => {
    const kept = [
      await referenced(),
      orphan(NOW),
      orphan(new Date(NOW.getTime() - 86400000)),
      object("submissions/unknown/README.md"),
      object("tenant/ses/material.html"),
    ];
    const removed = orphan();
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toMatchObject({ deleted: 1 });
    expect(objects.has(removed)).toBe(false);
    expect(kept.every((key) => objects.has(key))).toBe(true);
  });
  it("テナント削除でファイル索引が消えた後もR2から回収できる", async () => {
    const key = await referenced();
    await db.delete(tenants).where(eq(tenants.id, "ses"));
    expect((await db.select().from(submissionFiles)).length).toBe(0);
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toMatchObject({ deleted: 1 });
    expect(objects.has(key)).toBe(false);
  });
  it("1000件を超えるバケットを次回のcronで続きから走査する", async () => {
    for (let i = 0; i < 1205; i++) orphan();
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toMatchObject({
      scanned: 1000,
      deleted: 1000,
      cursor: expect.any(String),
    });
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toEqual({
      scanned: 205,
      deleted: 205,
      cursor: null,
    });
    expect([...objects.keys()]).toEqual([CURSOR_KEY]);
  });
  it("参照がページを埋めていてもカーソルを進め、後方の孤立ファイルを回収する", async () => {
    const key = await referenced();
    const id = key.split("/")[2];
    const oldIndexed = Array.from({ length: 1000 }, (_, i) => object(`submissions/ses/${id}/${i}`));
    for (const [i, objectKey] of oldIndexed.entries()) {
      if (objectKey === key) continue;
      await db.insert(submissionFiles).values({
        submissionId: id,
        path: `${i}.html`,
        objectKey,
        sha256: "a".repeat(64),
        bytes: 4,
      });
    }
    const tail = object("submissions/zzz/ffffffff-ffff-ffff-ffff-ffffffffffff/0");
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toMatchObject({
      scanned: 1000,
      deleted: 0,
    });
    expect(objects.has(tail)).toBe(true);
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toMatchObject({ deleted: 1 });
    expect(oldIndexed.every((key) => objects.has(key))).toBe(true);
  });
  it("D1の照合失敗では削除しない", async () => {
    const key = orphan();
    vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("D1 unavailable");
    });
    await expect(runSubmissionOrphanCleanup(env, db, NOW)).rejects.toThrow("D1 unavailable");
    expect(objects.has(key)).toBe(true);
    expect(env.SUBMISSIONS_BUCKET?.delete).not.toHaveBeenCalled();
    expect(objects.has(CURSOR_KEY)).toBe(false);
  });
  it("削除に失敗したらカーソルを進めず、次回に再試行する", async () => {
    const key = orphan();
    vi.mocked(env.SUBMISSIONS_BUCKET?.delete)?.mockRejectedValueOnce(new Error("R2 unavailable"));
    await expect(runSubmissionOrphanCleanup(env, db, NOW)).rejects.toThrow("R2 unavailable");
    expect(objects.has(key)).toBe(true);
    expect(objects.has(CURSOR_KEY)).toBe(false);
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toMatchObject({ deleted: 1 });
  });
  it("他の回収処理がロックを持っている場合は走査しない", async () => {
    await db.insert(resourceLocks).values({
      id: "submission-orphan-cleanup",
      holder: "another-worker",
      expiresAt: new Date(Date.now() + 120000),
    });
    expect(await runSubmissionOrphanCleanup(env, db, NOW)).toBeUndefined();
    expect(env.SUBMISSIONS_BUCKET?.list).not.toHaveBeenCalled();
  });
});
