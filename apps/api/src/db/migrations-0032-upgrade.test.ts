/**
 * Phase 0 — 破壊的リネーム (0032) の **アップグレード経路** を実データで検証する。
 *
 * CI の通し適用 (0000 から順に流す) では 0032 に着く時点で `courses` が空なので、
 * 「既にデータが入っている本番の DB に当てたときに壊れないか」は一切見ていない。
 * `d1-smoke` も表の有無を数えるだけで、行・FK・索引の破損は検出できない。
 *
 * そこでここでは 0000〜0031 まで適用した DB に代表的な行を入れ、0032 を当てて
 *
 *   - 行が 1 件も失われず ID も変わらないこと
 *   - 参照側の FOREIGN KEY が `stages` へ追随すること (SQLite の RENAME TO の挙動)
 *   - `PRAGMA foreign_key_check` が空であること
 *   - 旧名の索引が消え、新名の索引が一意性を保っていること
 *
 * を固定する。リネームは「値を変えない」約束の上に立っているので、`thumbnail_path`
 * (R2 の `courses/<slug>/...` キー) が触られていないことも併せて見る。
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

const DRIZZLE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

interface JournalEntry {
  idx: number;
  tag: string;
}

function journalTags(): string[] {
  const journal = JSON.parse(readFileSync(join(DRIZZLE_DIR, "meta/_journal.json"), "utf8")) as {
    entries: JournalEntry[];
  };
  return [...journal.entries].sort((a, b) => a.idx - b.idx).map((entry) => entry.tag);
}

/** 1 ファイルを適用する (drizzle の `--> statement-breakpoint` 区切り)。 */
function applyMigration(db: DatabaseSync, tag: string): void {
  const sql = readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (trimmed !== "") db.exec(trimmed);
  }
}

const RENAME_TAG = "0032_rename_courses_to_stages";

/** 0032 の 1 つ前までを適用した DB (= 改名前の本番と同じ形)。 */
function migrateUpToRename(db: DatabaseSync): void {
  for (const tag of journalTags()) {
    if (tag === RENAME_TAG) return;
    applyMigration(db, tag);
  }
  throw new Error(`${RENAME_TAG} が journal にありません`);
}

/** 参照側の表が指している (表名, 列名, 参照先列) の一覧。 */
function foreignKeys(
  db: DatabaseSync,
  table: string,
): { table: string; from: string; to: string }[] {
  return (db.prepare(`pragma foreign_key_list(${table})`).all() as unknown[]).map((raw) => {
    const row = raw as { table: string; from: string; to: string };
    return { table: row.table, from: row.from, to: row.to };
  });
}

function indexNames(db: DatabaseSync): string[] {
  const rows = db
    .prepare("select name from sqlite_master where type = 'index' and name is not null")
    .all() as { name: string }[];
  return rows.map((row) => row.name);
}

const THUMB = "tenant/ses/courses/c1/thumbnail.webp";

describe("0032 (courses → stages) を既存データの入った DB に適用する", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("pragma foreign_keys = off");
    migrateUpToRename(db);

    // 改名前の語彙で代表的な行を入れる (親 → 子の順)。
    db.exec(`
      insert into tenants (id, name, created_at, updated_at)
        values ('ses', 'SES', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, created_at)
        values ('u1', 'ses', 'student', 'Seed Learner', 1);
      insert into courses (id, tenant_id, slug, title, status, thumbnail_path, created_at, updated_at)
        values ('c1', 'ses', 'typescript-basics', 'TypeScript 入門研修', 'published', '${THUMB}', 1, 1);
      insert into sections (id, course_id, title, "order", created_at)
        values ('s1', 'c1', 'M1', 0, 1);
      insert into enrollments (id, tenant_id, user_id, course_id, status, enrolled_at)
        values ('e1', 'ses', 'u1', 'c1', 'active', 1);
      insert into certificates
        (id, tenant_id, user_id, course_id, cert_code, course_title, recipient_name, tenant_name, criteria_snapshot, issued_at)
        values ('cert1', 'ses', 'u1', 'c1', 'FLC-2026-AAAA-BBBB', 'TypeScript 入門研修', 'Seed Learner', 'SES', '{}', 1);
    `);
  });

  it("行は 1 件も失われず、ID と thumbnail_path の値も変わらない", () => {
    applyMigration(db, RENAME_TAG);

    const stage = db.prepare("select id, slug, thumbnail_path from stages").get() as {
      id: string;
      slug: string;
      thumbnail_path: string;
    };
    expect(stage).toEqual({ id: "c1", slug: "typescript-basics", thumbnail_path: THUMB });

    // 参照側は列名が変わるだけで、指す先の ID は同じ。
    expect(db.prepare("select stage_id from sections where id = 's1'").get()).toEqual({
      stage_id: "c1",
    });
    expect(db.prepare("select stage_id from enrollments where id = 'e1'").get()).toEqual({
      stage_id: "c1",
    });
    expect(
      db.prepare("select stage_id, stage_title from certificates where id = 'cert1'").get(),
    ).toEqual({ stage_id: "c1", stage_title: "TypeScript 入門研修" });

    // 旧名の表は残らない。
    const tables = (
      db.prepare("select name from sqlite_master where type = 'table'").all() as { name: string }[]
    ).map((row) => row.name);
    expect(tables).toContain("stages");
    expect(tables).not.toContain("courses");
  });

  it("参照側の FOREIGN KEY が stages / stage_id へ追随する", () => {
    applyMigration(db, RENAME_TAG);

    for (const table of ["sections", "enrollments", "certificates"]) {
      const fk = foreignKeys(db, table).find((row) => row.table === "stages");
      expect(fk, `${table} の FK が stages を指していない`).toBeDefined();
      expect(fk?.from).toBe("stage_id");
    }
    // 旧名を指す FK が残っていない。
    for (const table of ["sections", "enrollments", "certificates"]) {
      expect(foreignKeys(db, table).some((row) => row.table === "courses")).toBe(false);
    }
  });

  it("参照の整合が壊れない (foreign_key_check が空)", () => {
    applyMigration(db, RENAME_TAG);
    db.exec("pragma foreign_keys = on");
    expect(db.prepare("pragma foreign_key_check").all()).toEqual([]);
  });

  it("旧名の索引が消え、新名の索引が一意性を保つ", () => {
    applyMigration(db, RENAME_TAG);

    expect(indexNames(db).filter((name) => name.includes("course"))).toEqual([]);
    expect(indexNames(db)).toContain("stages_tenant_slug_uq");

    // (tenant_id, slug) の重複は新しい索引が弾く。
    expect(() =>
      db.exec(
        `insert into stages (id, tenant_id, slug, title, status, created_at, updated_at)
           values ('c2', 'ses', 'typescript-basics', '重複', 'draft', 1, 1)`,
      ),
    ).toThrow();
    // 同じ受講者 × 同じステージの二重登録も弾く。
    expect(() =>
      db.exec(
        `insert into enrollments (id, tenant_id, user_id, stage_id, status, enrolled_at)
           values ('e2', 'ses', 'u1', 'c1', 'active', 1)`,
      ),
    ).toThrow();
  });
});
