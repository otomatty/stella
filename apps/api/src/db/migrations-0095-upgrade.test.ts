import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const TAG = "0095_lesson_problem_columns";
const migration = readFileSync(new URL(`../../drizzle/${TAG}.sql`, import.meta.url), "utf8");
let database: ReturnType<typeof sqliteD1> | undefined;
afterEach(() => database?.sqlite.close());

describe("0095: 問題の対応を lessons の列へ移し、task_problem_steps は残す", () => {
  it("既存の対応を写し、表は残し、null は一意制約の対象外", () => {
    database = sqliteD1({ beforeMigration: TAG });
    const sqlite = database.sqlite;
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', 'テスト', 1, 1);
      insert into stages (id, tenant_id, slug, title, created_at, updated_at)
        values ('stage', 'ses', 'test-stage', '架空のステージ', 1, 1);
      insert into sections (id, stage_id, title, created_at) values ('unit', 'stage', '単元', 1);
      insert into lessons (id, section_id, title, type, "order", created_at, updated_at) values
        ('video', 'unit', '動画', 'slides', 0, 1, 1),
        ('step', 'unit', '問1', 'text', 1, 1, 1),
        ('plain', 'unit', 'まとめ', 'text', 2, 1, 1);
      insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle)
        values ('task', 'unit', '課題', 'basic', 'p', '{}', 10, 0, 'hash', '{}', '{}');
      insert into task_problem_steps (task_id, problem_id, step_lesson_id, after_lesson_id, position)
        values ('task', 'q01', 'step', 'video', 0);
    `);

    sqlite.exec(migration);

    expect(
      sqlite.prepare("select id, problem_task_id, problem_id from lessons order by id").all(),
    ).toEqual([
      { id: "plain", problem_task_id: null, problem_id: null },
      { id: "step", problem_task_id: "task", problem_id: "q01" },
      { id: "video", problem_task_id: null, problem_id: null },
    ]);
    expect(
      sqlite.prepare("select task_id, problem_id, step_lesson_id from task_problem_steps").all(),
    ).toEqual([{ task_id: "task", problem_id: "q01", step_lesson_id: "step" }]);
    expect(
      sqlite.prepare("select name from sqlite_master where name = 'task_problem_steps'").get(),
    ).toEqual({
      name: "task_problem_steps",
    });
    expect(migration.toLowerCase()).not.toMatch(/drop table/);

    sqlite.exec(
      "insert into lessons (id, section_id, title, type, created_at, updated_at) values ('another', 'unit', '別', 'text', 1, 1)",
    );
    expect(() =>
      sqlite.exec(
        "insert into lessons (id, section_id, title, type, problem_task_id, problem_id, created_at, updated_at) values ('dup', 'unit', '重複', 'text', 'task', 'q01', 1, 1)",
      ),
    ).toThrow(/UNIQUE/);
  });
});
