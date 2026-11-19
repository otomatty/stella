import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

it("0086: 腕試しの履歴と索引を落とし、既存の解放記録と他の表を残す", () => {
  const { sqlite } = sqliteD1({ beforeMigration: "0086_drop_skill_check_attempts" });
  try {
    expect(sqlite.prepare("pragma foreign_keys").get()).toEqual({ foreign_keys: 1 });
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', '架空の組織', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, created_at)
        values ('learner', 'ses', 'student', '架空の受講者', 1);
      insert into stages (id, tenant_id, slug, title, created_at, updated_at) values
        ('legacy', 'ses', 'legacy-stage', '飛び級で開いたステージ', 1, 1),
        ('exempt', 'ses', 'exempt-stage', '前提を免除したステージ', 1, 1);
      insert into stage_unlocks (id, tenant_id, user_id, stage_id, via, unlocked_at) values
        ('legacy-unlock', 'ses', 'learner', 'legacy', 'skill_check', 2),
        ('staff-unlock', 'ses', 'learner', 'exempt', 'staff', 2);
      insert into skill_check_attempts
        (id, tenant_id, user_id, stage_id, score, max_score, passed, submitted_at)
        values ('attempt', 'ses', 'learner', 'legacy', 8, 10, 1, 2);
    `);
    const attemptSchema = () =>
      sqlite
        .prepare(
          "select type, name from sqlite_master where tbl_name = 'skill_check_attempts' order by name",
        )
        .all();
    expect(attemptSchema()).toEqual([
      { type: "table", name: "skill_check_attempts" },
      { type: "index", name: "skill_check_attempts_user_stage_idx" },
      { type: "index", name: "sqlite_autoindex_skill_check_attempts_1" },
    ]);
    const attempts = sqlite.prepare("select count(*) as n from skill_check_attempts").get();
    expect(attempts).toEqual({ n: 1 });

    const otherSchema = () =>
      sqlite
        .prepare(
          "select * from sqlite_master where tbl_name <> 'skill_check_attempts' order by name",
        )
        .all();
    const retainedRows = () =>
      ["tenants", "profiles", "stages", "stage_unlocks"].map((table) =>
        sqlite.prepare(`select * from "${table}" order by rowid`).all(),
      );
    const schema = otherSchema();
    const rows = retainedRows();
    const sql = readFileSync(
      new URL("../../drizzle/0086_drop_skill_check_attempts.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql.split("--> statement-breakpoint")) sqlite.exec(statement);

    expect(attemptSchema()).toEqual([]);
    expect(otherSchema()).toEqual(schema);
    expect(retainedRows()).toEqual(rows);
    expect(sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
    sqlite.exec(sql);
  } finally {
    sqlite.close();
  }
});
