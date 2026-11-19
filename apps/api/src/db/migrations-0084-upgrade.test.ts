import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

it("0084: 受講者のキューの表と索引を落とし、学習フォーカスと他の表を残す", () => {
  const { sqlite } = sqliteD1({ beforeMigration: "0084_drop_stage_queue" });
  try {
    expect(sqlite.prepare("pragma foreign_keys").get()).toEqual({ foreign_keys: 1 });
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', '架空の組織', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, created_at)
        values ('learner', 'ses', 'student', '架空の受講者', 1);
      insert into stages (id, tenant_id, slug, title, created_at, updated_at) values
        ('active', 'ses', 'active-stage', '進行中のステージ', 1, 1),
        ('later', 'ses', 'later-stage', 'あとで始めるステージ', 1, 1);
      insert into learner_focus (user_id, tenant_id, active_stage_id, updated_at)
        values ('learner', 'ses', 'active', 2);
      insert into stage_queue (id, tenant_id, user_id, stage_id, "order", added_at)
        values ('queue-entry', 'ses', 'learner', 'later', 0, 3);
    `);
    const queueSchema = () =>
      sqlite
        .prepare(
          "select type, name from sqlite_master where tbl_name = 'stage_queue' order by name",
        )
        .all();
    expect(queueSchema()).toEqual([
      { type: "index", name: "sqlite_autoindex_stage_queue_1" },
      { type: "table", name: "stage_queue" },
      { type: "index", name: "stage_queue_user_order_idx" },
      { type: "index", name: "stage_queue_user_stage_uq" },
    ]);
    expect(sqlite.prepare("select count(*) as n from stage_queue").get()).toEqual({ n: 1 });

    const otherSchema = () =>
      sqlite
        .prepare("select * from sqlite_master where tbl_name <> 'stage_queue' order by name")
        .all();
    const retainedRows = () =>
      ["tenants", "profiles", "stages", "learner_focus"].map((table) =>
        sqlite.prepare(`select * from "${table}" order by rowid`).all(),
      );
    const schema = otherSchema();
    const rows = retainedRows();
    const sql = readFileSync(
      new URL("../../drizzle/0084_drop_stage_queue.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql.split("--> statement-breakpoint")) sqlite.exec(statement);

    expect(queueSchema()).toEqual([]);
    expect(otherSchema()).toEqual(schema);
    expect(retainedRows()).toEqual(rows);
    expect(sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
    sqlite.exec(sql);
  } finally {
    sqlite.close();
  }
});
