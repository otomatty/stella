import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { getDb } from "./client.js";
import { sections, stages, tasks, tenants } from "./schema.js";

const TAG = "0054_task_help_opens";
const SQL = readFileSync(
  fileURLToPath(new URL(`../../drizzle/${TAG}.sql`, import.meta.url)),
  "utf8",
);

describe("0054: 課題の版に、その版を配っていたときの素材の版を埋める (実SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  beforeEach(async () => {
    database = sqliteD1({ beforeMigration: TAG });
    const db = getDb({ DB: database.binding } as Env);
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db
        .insert(stages)
        .values({ id: "stage", tenantId: "ses", slug: "dev-env-basics", title: "入口", format: 2 }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "単元" }),
      db.insert(tasks).values({
        id: "page",
        sectionId: "unit",
        title: "page",
        kind: "basic",
        pattern: "p",
        estimatedMinutes: 10,
        order: 0,
        contentHash: "now",
        definition: "{}",
        bundle: "{}",
      }),
    ]);
    // task_revisions はこの移行で列が増えるので、移行前の列だけで入れる。
    database.sqlite.exec(`
      insert into task_revisions (task_id, content_hash, definition, bundle, created_at)
        values ('page', 'before', '{}', '{}', 1), ('page', 'now', '{}', '{}', 2);
      insert into task_private (task_id, files) values ('page', '{"hints.md":"new"}');
      insert into task_private_versions (task_id, private_hash, files, created_at)
        values ('page', 'p-old', '{"hints.md":"old"}', 1), ('page', 'p-new', '{"hints.md":"new"}', 2);
    `);
  });
  afterEach(() => database.sqlite.close());

  it("今の版だけを今の素材の版で埋め、前の版は分からないので null のまま", () => {
    database.sqlite.exec(SQL);
    const rows = database.sqlite
      .prepare("select content_hash, private_hash from task_revisions order by content_hash")
      .all();
    expect(rows).toEqual([
      { content_hash: "before", private_hash: null },
      { content_hash: "now", private_hash: "p-new" },
    ]);
  });
});
