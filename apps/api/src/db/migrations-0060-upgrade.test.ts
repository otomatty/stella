import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { getDb } from "./client.js";
import { profiles, sections, stages, tenants } from "./schema.js";

const TAG = "0060_variant_first_slot_recompute";
const SQL = readFileSync(
  fileURLToPath(new URL(`../../drizzle/${TAG}.sql`, import.meta.url)),
  "utf8",
);

describe("0060: まだ類題を出していない最初の出題を消し、新しい判定で積み直させる (実SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  beforeEach(async () => {
    database = sqliteD1({ beforeMigration: TAG });
    const db = getDb({ DB: database.binding } as Env);
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db
        .insert(profiles)
        .values({ id: "learner", tenantId: "ses", displayName: "受講者", role: "student" }),
      db
        .insert(stages)
        .values({ id: "stage", tenantId: "ses", slug: "dev-env-basics", title: "入口", format: 2 }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "単元" }),
    ]);
    // 後の移行で列が増えても壊れないよう、tasks と variant_reviews はこの時点の列だけで入れる。
    database.sqlite.exec(`
      insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order",
        content_hash, definition, bundle, variant_of)
        values ('variant', 'unit', '類題', 'independent', 'p', '{}', 10, 0, 'h', '{}', '{}', 'parent');
      insert into variant_reviews (id, tenant_id, user_id, pattern, step, purpose, anchor_at, due_on,
        status, variant_task_id, created_at, updated_at) values
        ('scheduled-1', 'ses', 'learner', 'a', 1, 'day3', 1, '2026-10-04', 'scheduled', null, 1, 1),
        ('stock-1', 'ses', 'learner', 'b', 1, 'remedial', 1, '2026-10-02', 'out-of-stock', null, 1, 1),
        ('issued-1', 'ses', 'learner', 'c', 1, 'day3', 1, '2026-10-04', 'issued', 'variant', 1, 1),
        ('passed-1', 'ses', 'learner', 'd', 1, 'day3', 1, '2026-10-04', 'passed', null, 1, 1),
        ('scheduled-2', 'ses', 'learner', 'd', 2, 'week3', 1, '2026-10-22', 'scheduled', null, 1, 1);
    `);
  });
  afterEach(() => database.sqlite.close());

  it("まだ出していない最初の出題だけを消し、出した・合格した出題と 2 段目以降は残す", () => {
    database.sqlite.exec(SQL);
    const ids = database.sqlite
      .prepare("select id from variant_reviews order by id")
      .all()
      .map((r) => (r as { id: string }).id);
    expect(ids).toEqual(["issued-1", "passed-1", "scheduled-2"]);
  });
});
