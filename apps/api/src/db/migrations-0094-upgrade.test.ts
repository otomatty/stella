import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

it("0094: 外部キーを有効にしたまま所属と設定を移し、実効の割り当てと連携イベントを保つ", () => {
  const { sqlite } = sqliteD1({ beforeMigration: "0094_groups" });
  try {
    expect(sqlite.prepare("pragma foreign_keys").get()).toEqual({ foreign_keys: 1 });
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', '架空の組織', 1, 1);
      insert into profiles (id, tenant_id, role, display_name, disabled, created_at) values
        ('learner', 'ses', 'student', '受講者', 0, 1),
        ('staff-learner', 'ses', 'student', '受講者B', 0, 1),
        ('admin', 'ses', 'admin', '管理者', 0, 1),
        ('disabled', 'ses', 'student', '無効な受講者', 1, 1);
      insert into stages (id, tenant_id, slug, title, audience, created_at, updated_at) values
        ('extra', 'ses', 'extra', '専用ステージ', 'granted', 1, 1),
        ('second', 'ses', 'second', '次のステージ', 'granted', 1, 1);
      insert into integration_clients (id, name, token_hash, token_prefix, created_at, updated_at)
        values ('client', '連携元', 'hash', 'prefix', 1, 1);
      insert into integration_groups (id, client_id, external_key, name, created_at, updated_at)
        values ('group', 'client', 'external-key', '連携グループ', 1, 2);
      insert into integration_group_members (group_id, profile_id, external_id, joined_at) values
        ('group', 'learner', 'external-learner', 3), ('group', 'admin', null, 4),
        ('group', 'disabled', null, 5);
      insert into integration_group_stages (group_id, stage_id, due_at, message, exempt)
        values ('group', 'extra', '2026-12-10T00:00:00.000Z', 'グループの案内', 1);
      insert into stage_grants (id, tenant_id, stage_id, profile_id, source_group_id, source_name, message, granted_at) values
        ('materialized', 'ses', 'extra', 'learner', 'group', '以前の連携元', '以前の案内', 6),
        ('manual', 'ses', 'second', 'learner', null, '手動の案内元', '手動の案内', 7);
      insert into stage_unlocks (id, tenant_id, stage_id, user_id, source_group_id, via, unlocked_at) values
        ('materialized', 'ses', 'extra', 'learner', 'group', 'staff', 6),
        ('manual', 'ses', 'second', 'learner', null, 'staff', 7),
        ('old-check', 'ses', 'extra', 'staff-learner', null, 'skill_check', 8);
      insert into enrollments (id, tenant_id, user_id, stage_id, enrolled_at)
        values ('existing', 'ses', 'learner', 'second', 9);
    `);
    const migration = readFileSync(
      new URL("../../drizzle/0094_groups.sql", import.meta.url),
      "utf8",
    );
    for (const statement of migration.split("--> statement-breakpoint")) sqlite.exec(statement);

    expect(sqlite.prepare("select * from groups").all()).toEqual([
      {
        id: "group",
        client_id: "client",
        external_key: "external-key",
        name: "連携グループ",
        share_progress: 0,
        created_by: null,
        created_at: 1,
        updated_at: 2,
      },
    ]);
    expect(sqlite.prepare("select * from group_members order by joined_at").all()).toEqual([
      {
        group_id: "group",
        profile_id: "learner",
        external_id: "external-learner",
        peer_name: null,
        joined_at: 3,
      },
      { group_id: "group", profile_id: "admin", external_id: null, peer_name: null, joined_at: 4 },
      {
        group_id: "group",
        profile_id: "disabled",
        external_id: null,
        peer_name: null,
        joined_at: 5,
      },
    ]);
    expect(sqlite.prepare("select * from group_stages").all()).toEqual([
      {
        group_id: "group",
        stage_id: "extra",
        due_at: "2026-12-10T00:00:00.000Z",
        message: "グループの案内",
        exempt: 1,
      },
    ]);
    expect(sqlite.prepare("select id, source_name from stage_grants").all()).toEqual([
      { id: "manual", source_name: "手動の案内元" },
    ]);
    expect(sqlite.prepare("select id, via from stage_unlocks order by id").all()).toEqual([
      { id: "manual", via: "staff" },
      { id: "old-check", via: "skill_check" },
    ]);

    sqlite.exec(`
      insert into groups (id, name, created_by, created_at, updated_at)
        values ('staff-group', '管理者のグループ', 'admin', 10, 10);
      insert into group_members (group_id, profile_id, joined_at) values
        ('staff-group', 'staff-learner', 10), ('staff-group', 'learner', 10);
      insert into group_stages (group_id, stage_id, message, exempt)
        values ('staff-group', 'extra', '管理者の案内', 1);
    `);
    expect(
      sqlite
        .prepare("select * from effective_stage_grants order by stage_id, profile_id, group_id")
        .all(),
    ).toEqual([
      {
        stage_id: "extra",
        profile_id: "learner",
        due_at: "2026-12-10T00:00:00.000Z",
        message: "グループの案内",
        source_name: "連携元",
        group_id: "group",
      },
      {
        stage_id: "extra",
        profile_id: "learner",
        due_at: null,
        message: "管理者の案内",
        source_name: null,
        group_id: "staff-group",
      },
      {
        stage_id: "extra",
        profile_id: "staff-learner",
        due_at: null,
        message: "管理者の案内",
        source_name: null,
        group_id: "staff-group",
      },
      {
        stage_id: "second",
        profile_id: "learner",
        due_at: null,
        message: "手動の案内",
        source_name: "手動の案内元",
        group_id: null,
      },
    ]);
    expect(
      sqlite
        .prepare("select * from effective_stage_unlocks order by stage_id, user_id, group_id")
        .all(),
    ).toEqual([
      { stage_id: "extra", user_id: "learner", via: "staff", group_id: "group" },
      { stage_id: "extra", user_id: "learner", via: "staff", group_id: "staff-group" },
      { stage_id: "extra", user_id: "staff-learner", via: "skill_check", group_id: null },
      { stage_id: "extra", user_id: "staff-learner", via: "staff", group_id: "staff-group" },
      { stage_id: "second", user_id: "learner", via: "staff", group_id: null },
    ]);

    sqlite.exec(`
      insert into enrollments (id, tenant_id, user_id, stage_id, enrolled_at) values
        ('integration-start', 'ses', 'learner', 'extra', 11),
        ('staff-group-start', 'ses', 'staff-learner', 'extra', 12);
    `);
    expect(
      sqlite
        .prepare("select type, user_id, stage_id, occurred_at from integration_events order by seq")
        .all(),
    ).toEqual([
      { type: "stage_started", user_id: "learner", stage_id: "second", occurred_at: 9 },
      { type: "stage_started", user_id: "learner", stage_id: "extra", occurred_at: 11 },
    ]);
    expect(sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
    expect(sqlite.prepare("pragma foreign_keys").get()).toEqual({ foreign_keys: 1 });
  } finally {
    sqlite.close();
  }
});
