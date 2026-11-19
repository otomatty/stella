import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

it("0087: AI チャットの支援記録と索引を落とし、他の支援記録と育成メモを残す", () => {
  const { sqlite } = sqliteD1({ beforeMigration: "0087_drop_task_support_events" });
  try {
    expect(sqlite.prepare("pragma foreign_keys").get()).toEqual({ foreign_keys: 1 });
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', '架空の組織', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, created_at)
        values ('learner', 'ses', 'student', '架空の受講者', 1);
      insert into stages (id, tenant_id, slug, title, created_at, updated_at)
        values ('stage', 'ses', 'practice', '練習のステージ', 1, 1);
      insert into sections (id, stage_id, title, created_at) values ('section', 'stage', '単元', 1);
      insert into tasks
        (id, section_id, title, kind, pattern, skills, estimated_minutes, "order",
         content_hash, definition, bundle)
        values ('task', 'section', '課題', 'basic', 'practice', '{}', 30, 0, 'hash', '{}', '{}');
      insert into task_support_events (id, tenant_id, user_id, task_id, kind, created_at)
        values ('event', 'ses', 'learner', 'task', 'ai-chat', 2);
      insert into task_help_opens
        (tenant_id, user_id, task_id, item, level, content_hash, private_hash, opened_at)
        values ('ses', 'learner', 'task', 'hint', 1, 'hash', 'private', 3);
      insert into task_fixed_start_uses (tenant_id, user_id, task_id, content_hash, used_at)
        values ('ses', 'learner', 'task', 'hash', 4);
      insert into mentor_memos (id, tenant_id, learner_id, week_start, material, next_attempt_at, created_at)
        values ('memo', 'ses', 'learner', '2026-11-16', '{"support":{"ai-chat":1}}', 5, 5);
    `);
    const supportSchema = () =>
      sqlite
        .prepare(
          "select type, name from sqlite_master where tbl_name = 'task_support_events' order by name",
        )
        .all();
    expect(supportSchema()).toEqual([
      { type: "index", name: "sqlite_autoindex_task_support_events_1" },
      { type: "table", name: "task_support_events" },
      { type: "index", name: "task_support_events_task_id_idx" },
      { type: "index", name: "task_support_events_user_task_idx" },
    ]);
    expect(sqlite.prepare("select count(*) as n from task_support_events").get()).toEqual({ n: 1 });

    const otherSchema = () =>
      sqlite
        .prepare(
          "select * from sqlite_master where tbl_name <> 'task_support_events' order by name",
        )
        .all();
    const retainedRows = () =>
      ["task_help_opens", "task_fixed_start_uses", "mentor_memos"].map((table) =>
        sqlite.prepare(`select * from "${table}" order by rowid`).all(),
      );
    const schema = otherSchema();
    const rows = retainedRows();
    const sql = readFileSync(
      new URL("../../drizzle/0087_drop_task_support_events.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql.split("--> statement-breakpoint")) sqlite.exec(statement);

    expect(supportSchema()).toEqual([]);
    expect(otherSchema()).toEqual(schema);
    expect(retainedRows()).toEqual(rows);
    expect(sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
    sqlite.exec(sql);
  } finally {
    sqlite.close();
  }
});
