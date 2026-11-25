import { encodeProblemHashes, problemFingerprints } from "@stella/shared/tasks/problems";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../db/client.js";
import { sections, stages, taskRevisions, tasks, tenants } from "../db/schema.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { loadProblemRevisionHashes, parseHashes } from "./task-problem-hashes.js";

const TASK = "stage/unit/calc";
const CURRENT = "c".repeat(64);
const OLD = "b".repeat(64);
const KEPT = "a".repeat(64);

describe("parseHashes", () => {
  it("版 2 は全項目が 64 桁のときだけ使い、1 つでも壊れていたら捨てる", () => {
    expect(
      parseHashes(JSON.stringify({ version: 2, hashes: { q1: "broken", q2: KEPT } })),
    ).toBeUndefined();
    expect(parseHashes(JSON.stringify({ version: 2, hashes: { q1: "broken" } }))).toBeUndefined();
    expect(parseHashes(JSON.stringify({ version: 2, hashes: { q1: KEPT } }))).toEqual({ q1: KEPT });
  });
});

describe("loadProblemRevisionHashes", () => {
  let database: ReturnType<typeof sqliteD1>;

  afterEach(() => database?.sqlite.close());

  async function seed(stored: string) {
    database = sqliteD1();
    const db = getDb({ DB: database.binding } as Env);
    const problems = [{ id: "q1", title: "問1" }];
    const manifest = {
      id: TASK,
      schemaVersion: 1,
      title: "計算",
      kind: "basic",
      runner: "node-test" as const,
      problems,
      submit: { files: ["src/**/*.ts"] },
      checks: { lint: false, format: false },
    };
    const files = {
      "src/q1.ts": Buffer.from("export const value = 0;\n").toString("base64"),
      "tests/q1.test.ts": Buffer.from('test("q1", () => {});\n').toString("base64"),
    };
    const definition = JSON.stringify({
      runner: "node-test",
      problems,
      skills: { assesses: [] },
    });
    const bundle = (hash: string) => JSON.stringify({ manifest, contentHash: hash, files });
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(stages).values({
        id: "stage",
        slug: "dev-env-basics",
        title: "使い方",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "計算", order: 0 }),
      db.insert(tasks).values({
        id: TASK,
        sectionId: "unit",
        title: "計算",
        kind: "basic",
        pattern: "calc",
        skills: { uses: [], assesses: [] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: CURRENT,
        definition,
        bundle: bundle(CURRENT),
      }),
      db.insert(taskRevisions).values([
        {
          taskId: TASK,
          contentHash: CURRENT,
          definition,
          bundle: bundle(CURRENT),
          problemHashes: encodeProblemHashes({ q1: KEPT }),
        },
        {
          taskId: TASK,
          contentHash: OLD,
          definition,
          bundle: bundle(OLD),
          problemHashes: stored,
        },
      ]),
    ]);
    return { db, manifest, files };
  }

  async function stored(db: ReturnType<typeof getDb>) {
    const rows = await db.select().from(taskRevisions);
    return rows.find((row) => row.contentHash === OLD)?.problemHashes;
  }

  it("不正な項目だけの版 2 は配布一式から計算し直して書き戻す", async () => {
    const { db, manifest, files } = await seed(
      JSON.stringify({ version: 2, hashes: { q1: "broken" } }),
    );
    const before = await stored(db);
    const cache = await loadProblemRevisionHashes(db, [
      { taskId: TASK, currentHash: CURRENT, rows: [{ contentHash: OLD }] },
    ]);
    const expected = await problemFingerprints(manifest, files);
    expect(cache.get(TASK)?.get(OLD)?.hashes).toEqual(expected);
    expect(JSON.parse((await stored(db)) ?? "null")).toEqual({ version: 2, hashes: expected });
    expect(await stored(db)).not.toBe(before);
  });

  it("有効と不正が混ざった版 2 も計算し直して書き戻す", async () => {
    const { db, manifest, files } = await seed(
      JSON.stringify({ version: 2, hashes: { q1: "broken", q2: KEPT } }),
    );
    const cache = await loadProblemRevisionHashes(db, [
      { taskId: TASK, currentHash: CURRENT, rows: [{ contentHash: OLD }] },
    ]);
    const expected = await problemFingerprints(manifest, files);
    expect(cache.get(TASK)?.get(OLD)?.hashes).toEqual(expected);
    expect(JSON.parse((await stored(db)) ?? "null")).toEqual({ version: 2, hashes: expected });
  });

  it("すべて有効な版 2 はそのまま使い、書き戻さない", async () => {
    const saved = encodeProblemHashes({ q1: KEPT });
    const { db } = await seed(saved);
    const seen: { definition: string | null; bundle: string | null; content_hash: string }[] = [];
    const prepare = database.binding.prepare.bind(database.binding);
    database.binding.prepare = ((sql: string) => {
      const statement = prepare(sql);
      const bind = statement.bind.bind(statement);
      statement.bind = (...params: unknown[]) => {
        const bound = bind(...params);
        if (sql.includes("join task_revisions")) {
          const all = bound.all.bind(bound);
          bound.all = (async () => {
            const result = await all();
            seen.push(...(result.results as typeof seen));
            return result;
          }) as typeof bound.all;
        }
        return bound;
      };
      return statement;
    }) as typeof database.binding.prepare;
    const cache = await loadProblemRevisionHashes(db, [
      { taskId: TASK, currentHash: CURRENT, rows: [{ contentHash: OLD }] },
    ]);
    expect(cache.get(TASK)?.get(OLD)?.hashes).toEqual({ q1: KEPT });
    expect(await stored(db)).toBe(saved);
    expect(seen.find((row) => row.content_hash === OLD)).toMatchObject({
      definition: null,
      bundle: null,
    });
  });
});
