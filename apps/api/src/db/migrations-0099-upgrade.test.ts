import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const TAG = "0099_group_activity";
const migration = readFileSync(new URL(`../../drizzle/${TAG}.sql`, import.meta.url), "utf8");

it("0099 は既存の進捗公開を保ち、タイムライン公開と節目の非表示を既定でオフにする", () => {
  const { sqlite } = sqliteD1({ beforeMigration: TAG });
  try {
    sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', 'SES', 1, 1);
      insert into profiles (id, tenant_id, display_name, created_at)
        values ('target', 'ses', 'Target', 1), ('sender', 'ses', 'Sender', 1);
      insert into groups (id, name, share_progress, created_at, updated_at)
        values ('group', 'Group', 1, 1, 1);
    `);
    sqlite.exec(migration);
    expect(sqlite.prepare("select share_progress, share_activity from groups").get()).toEqual({
      share_progress: 1,
      share_activity: 0,
    });
    expect(sqlite.prepare("select distinct hide_group_activity from profiles").all()).toEqual([
      { hide_group_activity: 0 },
    ]);
    expect(() => sqlite.exec("update groups set share_activity = 2")).toThrow();
    expect(() => sqlite.exec("update profiles set hide_group_activity = 2")).toThrow();

    const reaction = sqlite.prepare(`
      insert into group_activity_reactions
        (group_id, kind, target_profile_id, ref, from_profile_id, emoji, created_at)
      values ('group', ?, 'target', '2026-11-28', 'sender', '👏', 1)
    `);
    expect(() => reaction.run("unknown")).toThrow();
    reaction.run("ahead");
    expect(() => reaction.run("ahead")).toThrow();
    sqlite.exec("delete from groups where id = 'group'");
    expect(sqlite.prepare("select count(*) total from group_activity_reactions").get()?.total).toBe(
      0,
    );
  } finally {
    sqlite.close();
  }
});
