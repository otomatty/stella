import { URL } from "node:url";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const TAG = "0076_manual_task_completion";
const migration = readFileSync(new URL(`../../drizzle/${TAG}.sql`, import.meta.url), "utf8");
let database: ReturnType<typeof sqliteD1> | undefined;
afterEach(() => database?.sqlite.close());
describe("0076: ALTERだけで既存の問題の出所をtestsにする", () => {
  it("既存のコード・版・合格日を保持し、手動の列はnullになる", () => {
    database = sqliteD1({ beforeMigration: TAG });
    const sqlite = database.sqlite;
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', 'テスト', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, created_at) values ('learner', 'ses', 'student', '架空の受講者', 1);
      insert into stages (id, tenant_id, slug, title, created_at, updated_at) values ('stage', 'ses', 'test-stage', '架空のステージ', 1, 1);
      insert into sections (id, stage_id, title, created_at) values ('unit', 'stage', '単元', 1);
      insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle)
      values ('task', 'unit', '課題', 'basic', 'p', '{}', 10, 0, 'hash', '{}', '{}');
      insert into task_problem_results (user_id, task_id, problem_id, content_hash, path, code, sha256, attempts, first_passed_at, updated_at)
      values ('learner', 'task', 'q01', 'hash', 'src/q01.ts', 'export const value = 1;', 'sha', 2, 1000, 2000);
    `);
    sqlite.exec(migration);
    expect(sqlite.prepare("select * from task_problem_results").get()).toMatchObject({
      source: "tests",
      manual_reason: null,
      manual_by: null,
      manual_at: null,
      code: "export const value = 1;",
      content_hash: "hash",
      attempts: 2,
      first_passed_at: 1000,
    });
    expect(migration.toLowerCase()).not.toMatch(/create table|drop table/);
    expect(() => sqlite.exec("update task_problem_results set source = 'unknown'")).toThrow();
  });
});
