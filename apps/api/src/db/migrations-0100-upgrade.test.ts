import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const TAG = "0100_reflection_share";
const migration = readFileSync(new URL(`../../drizzle/${TAG}.sql`, import.meta.url), "utf8");

it("0100 は既存の振り返りを非共有にし、管理者の削除時は隠した日時を残す", () => {
  const { sqlite } = sqliteD1({ beforeMigration: TAG });
  try {
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', 'SES', 1, 1);
      insert into profiles (id, tenant_id, display_name, role, created_at)
        values ('admin', 'ses', 'Admin', 'admin', 1);
      insert into submissions
        (id, tenant_id, stage_title, assignment_title, code, explanation, submitted_at)
        values ('submission', 'ses', 'Stage', 'Task', '', '既存の振り返り', 1);
    `);
    sqlite.exec(migration);
    const row = sqlite.prepare(`
      select explanation, share_reflection, reflection_hidden_at, reflection_hidden_by from submissions
    `);
    expect(row.get()).toEqual({
      explanation: "既存の振り返り",
      share_reflection: 0,
      reflection_hidden_at: null,
      reflection_hidden_by: null,
    });
    expect(() => sqlite.exec("update submissions set share_reflection = 2")).toThrow();
    expect(() => sqlite.exec("update submissions set reflection_hidden_by = 'unknown'")).toThrow();
    sqlite.exec(`
      update submissions set share_reflection = 1, reflection_hidden_at = 42, reflection_hidden_by = 'admin';
      delete from profiles where id = 'admin';
    `);
    expect(row.get()).toMatchObject({
      share_reflection: 1,
      reflection_hidden_at: 42,
      reflection_hidden_by: null,
    });
  } finally {
    sqlite.close();
  }
});
