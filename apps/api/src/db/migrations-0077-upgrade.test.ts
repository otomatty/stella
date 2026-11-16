import { URL } from "node:url";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

it("0077: ALTER ADD COLUMNだけで既存の割り当てを保ち、案内の列はnullにする", () => {
  const { sqlite } = sqliteD1({ beforeMigration: "0077_stage_grant_guidance" });
  try {
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', '架空の組織', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, created_at) values ('learner', 'ses', 'student', '架空の受講者', 1);
      insert into stages (id, tenant_id, slug, title, created_at, updated_at) values ('stage', 'ses', 'sample-stage', '架空のステージ', 1, 1);
      insert into stage_grants (id, tenant_id, stage_id, profile_id, granted_by, granted_at) values ('grant', 'ses', 'stage', 'learner', 'staff', 123);
    `);
    const before = sqlite.prepare("select * from stage_grants").get();
    const sql = readFileSync(
      new URL("../../drizzle/0077_stage_grant_guidance.sql", import.meta.url),
      "utf8",
    );
    expect(
      sql
        .split(";")
        .filter((part) => part.trim())
        .every((part) => /ALTER TABLE stage_grants ADD COLUMN/.test(part)),
    ).toBe(true);
    sqlite.exec(sql);
    expect(sqlite.prepare("select * from stage_grants").all()).toEqual([
      { ...before, source_name: null, due_at: null, message: null },
    ]);
  } finally {
    sqlite.close();
  }
});
