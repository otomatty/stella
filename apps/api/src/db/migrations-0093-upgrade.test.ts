import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

it("0093: 既存の課題の版を保ち、問題の指紋を未設定で追加する", () => {
  const { sqlite } = sqliteD1({ beforeMigration: "0093_task_revision_problem_hashes" });
  try {
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', '架空の組織', 1, 1);
      insert into stages (id, tenant_id, slug, title, created_at, updated_at) values ('stage', 'ses', 'practice', '練習', 1, 1);
      insert into sections (id, stage_id, title, created_at) values ('unit', 'stage', '単元', 1);
      insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle)
        values ('task', 'unit', '課題', 'basic', 'practice', '{}', 30, 0, 'hash', '{}', '{}');
      insert into task_revisions (task_id, content_hash, definition, bundle, created_at, private_hash)
        values ('task', 'hash', '{}', '{}', 1, 'private');
    `);
    const previous = sqlite.prepare("select * from task_revisions").get();
    sqlite.exec(
      readFileSync(
        new URL("../../drizzle/0093_task_revision_problem_hashes.sql", import.meta.url),
        "utf8",
      ),
    );
    expect(sqlite.prepare("select * from task_revisions").get()).toEqual({
      ...previous,
      problem_hashes: null,
    });
    expect(sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
  } finally {
    sqlite.close();
  }
});
