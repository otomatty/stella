import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, getDb } from "../db/client.js";
import { notifications } from "../db/schema.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { notifyGroupReactionDigests } from "./group-reaction-digest.js";

// 12 月 1 日 00:00 JST の直後。UTC の日付はまだ 11 月 30 日。
const todayStart = Date.parse("2026-11-30T15:00:00.000Z");
const yesterdayStart = Date.parse("2026-11-29T15:00:00.000Z");
const olderDayStart = Date.parse("2026-11-28T15:00:00.000Z");
const now = new Date(todayStart + 60_000);

describe("notifyGroupReactionDigests (実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let db: Db;
  let ref: number;

  beforeEach(() => {
    database = sqliteD1();
    db = getDb({ DB: database.binding } as Env);
    ref = 0;
    database.sqlite.exec(`
      insert into tenants (id, name, created_at, updated_at) values ('ses', 'SES', 1, 1);
      insert into profiles (id, tenant_id, display_name, created_at)
        values ('target', 'ses', 'Target', 1), ('sender-private-id', 'ses', 'Sender Private Name', 1);
      insert into groups (id, name, share_activity, created_at, updated_at)
        values ('main', 'Main', 1, 1, 1), ('other', 'Other', 1, 1, 1), ('closed', 'Closed', 0, 1, 1);
      insert into group_members (group_id, profile_id, joined_at)
        select groups.id, profiles.id, 1 from groups cross join profiles;
    `);
  });

  afterEach(() => database.sqlite.close());

  function react({
    emoji = "👏",
    createdAt = yesterdayStart,
    group = "main",
    from = "sender-private-id",
    target = "target",
  } = {}) {
    database.sqlite
      .prepare(`
        insert into group_activity_reactions
          (group_id, kind, target_profile_id, ref, from_profile_id, emoji, created_at)
        values (?, 'stage_start', ?, ?, ?, ?, ?)
      `)
      .run(group, target, `stage-${++ref}`, from, emoji, createdAt);
  }

  it("昨日と一昨日を日本時間で分けて本人に送り、今日・それ以前・再実行分は作らない", async () => {
    react({ createdAt: olderDayStart - 1 });
    react({ createdAt: olderDayStart });
    react({ createdAt: olderDayStart, target: "sender-private-id", from: "target" });
    react({ createdAt: yesterdayStart, group: "other" });
    react({ createdAt: todayStart - 1 });
    react({ createdAt: todayStart - 1, emoji: "🎉" });
    react({ createdAt: todayStart });

    await notifyGroupReactionDigests(db, now);
    // 送信済みの日に新しく対象となる行が見つかっても、通知の追加・上書きはしない。
    react({ emoji: "✨" });
    await notifyGroupReactionDigests(db, now);

    const rows = await db.select().from(notifications).orderBy(notifications.id);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: "group-reactions:sender-private-id:2026-11-29",
      userId: "sender-private-id",
      payload: { date: "2026-11-29", group_id: "main", count: 1 },
    });
    expect(rows[1]).toMatchObject({
      id: "group-reactions:target:2026-11-29",
      userId: "target",
      body: "11月29日 に 1 件のスタンプが届きました: 👏×1",
      payload: { date: "2026-11-29", group_id: "main", count: 1 },
    });
    expect(rows[2]).toMatchObject({
      id: "group-reactions:target:2026-11-30",
      userId: "target",
      type: "group_reactions",
      title: "仲間からスタンプが届きました",
      body: "11月30日 に 3 件のスタンプが届きました: 👏×2 🎉×1",
      createdAt: now,
      read: false,
    });
    expect(rows[2]?.payload).toEqual({ date: "2026-11-30", group_id: "main", count: 3 });
  });

  it("公開設定と双方の現在の所属・有効な受講者かどうかを確認する", async () => {
    const sqlite = database.sqlite;
    sqlite.exec(`
      insert into profiles (id, tenant_id, display_name, created_at)
        values ('left', 'ses', 'Left', 1), ('hidden', 'ses', 'Hidden', 1),
          ('disabled', 'ses', 'Disabled', 1), ('staff', 'ses', 'Staff', 1);
      insert into group_members (group_id, profile_id, joined_at)
        select 'main', id, 1 from profiles where id in ('left', 'hidden', 'disabled', 'staff');
    `);
    for (const profile of ["left", "disabled", "staff"]) {
      react({ from: profile });
      react({ target: profile });
    }
    react({ target: "hidden" });
    react({ from: "hidden", emoji: "🔥" });
    react({ group: "closed" });
    react({ from: "target" });
    react({ emoji: "🎉" });
    sqlite.exec(`
      delete from group_members where profile_id = 'left';
      update profiles set hide_group_activity = 1 where id = 'hidden';
      update profiles set disabled = 1 where id = 'disabled';
      update profiles set role = 'admin' where id = 'staff';
      delete from group_activity_reactions where emoji = '🎉';
    `);

    await notifyGroupReactionDigests(db, now);
    const rows = await db.select().from(notifications);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: "target",
      body: "11月30日 に 1 件のスタンプが届きました: 🔥×1",
      payload: { date: "2026-11-30", group_id: "main", count: 1 },
    });
  });

  it("件数順・最初に押された順で絵文字を 5 種類まで出す", async () => {
    react({ emoji: "👍", createdAt: yesterdayStart + 4 });
    react({ emoji: "🔥", createdAt: yesterdayStart + 3 });
    react({ emoji: "🎉", createdAt: yesterdayStart + 1 });
    react({ emoji: "✨", createdAt: yesterdayStart + 1 });
    react({ emoji: "💪", createdAt: yesterdayStart + 2 });
    react({ emoji: "👏", createdAt: yesterdayStart + 9 });
    react({ emoji: "👏", group: "other", createdAt: yesterdayStart + 9 });
    react({ emoji: "🔥", createdAt: yesterdayStart + 5 });
    react({ emoji: "👏", createdAt: yesterdayStart + 10 });

    await notifyGroupReactionDigests(db, now);
    const [row] = await db.select().from(notifications);
    expect(row?.body).toBe("11月30日 に 9 件のスタンプが届きました: 👏×3 🔥×2 🎉×1 ✨×1 💪×1");
    expect(row?.payload).toEqual({ date: "2026-11-30", group_id: "main", count: 9 });
    expect(JSON.stringify({ body: row?.body, payload: row?.payload })).not.toMatch(
      /sender-private-id|Sender Private Name/,
    );
  });

  it("2 日分を合わせて最大 200 通にし、残りは次の cron で送る", async () => {
    database.sqlite.exec(`
      with recursive ids(n) as (select 1 union all select n + 1 from ids where n < 101)
      insert into profiles (id, tenant_id, display_name, created_at)
        select 'learner-' || n, 'ses', 'Learner', 1 from ids;
      insert into group_members (group_id, profile_id, joined_at)
        select 'main', id, 1 from profiles where id like 'learner-%';
    `);
    for (let number = 1; number <= 101; number++) {
      const target = `learner-${number}`;
      react({ target, createdAt: olderDayStart });
      react({ target, createdAt: yesterdayStart });
    }

    await notifyGroupReactionDigests(db, now);
    expect(await db.select().from(notifications)).toHaveLength(200);
    await notifyGroupReactionDigests(db, now);
    const rows = await db.select().from(notifications);
    expect(rows).toHaveLength(202);
    expect(rows.filter((row) => row.payload.date === "2026-11-29")).toHaveLength(101);
    expect(rows.filter((row) => row.payload.date === "2026-11-30")).toHaveLength(101);
  });
});
