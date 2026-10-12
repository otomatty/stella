import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "../db/client.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { importAccessLogs, revokeAccessSessions } from "./security-cloudflare.js";
import { detectSecurityAlerts, jstDate } from "./security-detect.js";
import {
  insertSecurityEvent,
  purgeExpiredVscodeLinks,
  purgeOldSecurityEvents,
  upsertSession,
} from "./security-events.js";

let db: ReturnType<typeof sqliteD1>;
beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('ses', 'SES', 0, 1, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 'invite', 1),
      ('learner', 'ses', 'student', '受講者', 'learner@example.test', 0, 'invite', 1);
  `);
});
afterEach(() => db.sqlite.close());

const env = (extra: Partial<Env> = {}) =>
  ({
    DB: db.binding,
    PUBLIC_CONTENT_TENANT_ID: "ses",
    ALLOWED_ORIGINS: "https://stella.example.com",
    ...extra,
  }) as Env;

const NOW = new Date("2026-10-12T03:00:00.000Z"); // 日本時間 12:00
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

const alerts = () =>
  db.sqlite
    .prepare(
      "select rule, severity, subject, event_count, notified_at from security_alerts order by rule, subject",
    )
    .all() as Array<{
    rule: string;
    severity: string;
    subject: string | null;
    event_count: number;
    notified_at: number | null;
  }>;

async function seedEvent(event: Parameters<typeof insertSecurityEvent>[1]) {
  await insertSecurityEvent(getDb(env()), event);
}

describe("サインインの検知 (upsertSession)", () => {
  it("Access のトークンの発行時刻が変わったときだけ新しいサインインにする", async () => {
    const d = getDb(env());
    const actor = {
      id: "learner",
      tenantId: "ses",
      role: "student",
      email: "learner@example.test",
    };
    const meta = { ip: "203.0.113.1", country: "JP", userAgent: "UA" };
    expect(await upsertSession(d, actor, 100, meta, minutesAgo(30))).toBe(true);
    expect(await upsertSession(d, actor, 100, { ...meta, ip: "203.0.113.2" }, minutesAgo(10))).toBe(
      false,
    );
    expect(await upsertSession(d, actor, 200, { ...meta, country: "US" }, NOW)).toBe(true);
    const rows = db.sqlite
      .prepare(
        "select metadata from security_events where kind = 'session.start' order by created_at",
      )
      .all() as Array<{ metadata: string }>;
    expect(rows).toHaveLength(2);
    expect(JSON.parse(rows[1]?.metadata ?? "{}")).toMatchObject({
      previous_country: "JP",
      previous_ip: "203.0.113.1",
    });
  });
});

describe("複数の端末のセッション", () => {
  it("PC と携帯を交互に使っても、知っているセッションは新しいサインインにしない", async () => {
    const d = getDb(env());
    const actor = { id: "admin", tenantId: "ses", role: "admin", email: "admin@example.test" };
    const meta = { ip: "203.0.113.1", country: "JP", userAgent: "UA" };
    expect(await upsertSession(d, actor, 100, meta, minutesAgo(40))).toBe(true);
    expect(await upsertSession(d, actor, 200, meta, minutesAgo(30))).toBe(true);
    expect(await upsertSession(d, actor, 100, meta, minutesAgo(20))).toBe(false);
    expect(await upsertSession(d, actor, 200, meta, minutesAgo(10))).toBe(false);
    expect(
      (
        db.sqlite
          .prepare("select count(*) as n from security_events where kind = 'session.start'")
          .get() as { n: number }
      ).n,
    ).toBe(2);
  });
});

describe("detectSecurityAlerts", () => {
  it("いつもと違う国からのサインインを出す (初めてのサインインでは出さない)", async () => {
    await seedEvent({
      kind: "session.start",
      tenantId: "ses",
      actorId: "learner",
      actorRole: "student",
      country: "JP",
      createdAt: new Date(NOW.getTime() - 5 * 86_400_000),
    });
    await seedEvent({
      kind: "session.start",
      tenantId: "ses",
      actorId: "admin",
      actorRole: "admin",
      country: "JP",
      createdAt: minutesAgo(20),
    });
    await seedEvent({
      kind: "session.start",
      tenantId: "ses",
      actorId: "learner",
      actorRole: "student",
      country: "US",
      createdAt: minutesAgo(10),
    });
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(alerts()).toEqual([
      expect.objectContaining({ rule: "new_location", severity: "medium", subject: "learner" }),
    ]);
  });

  it("管理者がいつもと違う国からサインインしたら重要度「高」で、管理者へアプリ内の通知を送る", async () => {
    await seedEvent({
      kind: "session.start",
      tenantId: "ses",
      actorId: "admin",
      actorRole: "admin",
      country: "JP",
      createdAt: new Date(NOW.getTime() - 2 * 86_400_000),
    });
    await seedEvent({
      kind: "session.start",
      tenantId: "ses",
      actorId: "admin",
      actorRole: "admin",
      country: "RU",
      createdAt: minutesAgo(5),
    });
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(alerts()).toEqual([expect.objectContaining({ rule: "new_location", severity: "high" })]);
    const notes = db.sqlite.prepare("select user_id, type from notifications").all();
    expect(notes).toEqual([{ user_id: "admin", type: "security_alert" }]);
    expect(alerts()[0]?.notified_at).not.toBeNull();
  });

  it("連続した拒否・403・未招待・無効化済み・認証なしをまとめて検知し、同じ日の同じ対象は 1 件にまとめる", async () => {
    for (let i = 0; i < 6; i++) {
      await seedEvent({
        kind: "access.denied",
        tenantId: "ses",
        source: "access",
        externalId: `ray-${i}`,
        email: "attacker@example.com",
        ip: "192.0.2.10",
        createdAt: minutesAgo(30 - i),
      });
    }
    for (let i = 0; i < 20; i++) {
      await seedEvent({
        kind: "authz.forbidden",
        tenantId: "ses",
        actorId: "learner",
        ip: "203.0.113.5",
        createdAt: minutesAgo(40 - i),
      });
    }
    await seedEvent({
      kind: "auth.no_profile",
      tenantId: "ses",
      email: "stranger@example.com",
      createdAt: minutesAgo(3),
    });
    await seedEvent({
      kind: "auth.disabled",
      tenantId: "ses",
      actorId: "gone",
      createdAt: minutesAgo(3),
    });
    await seedEvent({
      kind: "auth.invalid_token",
      tenantId: "ses",
      ip: "192.0.2.99",
      metadata: { reason: "missing" },
      createdAt: minutesAgo(2),
    });
    // 接続コードの打ち間違い (理由なしの 401) は 1 件では出さない。
    await seedEvent({
      kind: "auth.invalid_token",
      tenantId: "ses",
      ip: "192.0.2.50",
      createdAt: minutesAgo(2),
    });

    const created = await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(created.map((a) => a.rule).sort()).toEqual([
      "access_denied_burst",
      "access_denied_burst",
      "disabled_account_access",
      "forbidden_burst",
      "forbidden_burst",
      "invalid_token",
      "uninvited_identity",
    ]);

    // 次の検査で同じ日に同じ出来事が増えても、新しいアラートにはしない。
    await seedEvent({
      kind: "auth.no_profile",
      tenantId: "ses",
      email: "stranger@example.com",
      createdAt: new Date(NOW.getTime() + 60_000),
    });
    const again = await detectSecurityAlerts(
      getDb(env()),
      env(),
      new Date(NOW.getTime() + 15 * 60_000),
      vi.fn(),
    );
    expect(again.filter((a) => a.rule === "uninvited_identity")).toHaveLength(0);
    expect(alerts().find((a) => a.rule === "uninvited_identity")?.event_count).toBe(2);
  });

  it("サーバーエラーの急増は、起きた組織のアラートにする", async () => {
    db.sqlite.exec(
      `INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('other', 'Other', 0, 1, 0, 1, 1);`,
    );
    for (let i = 0; i < 20; i++) {
      await seedEvent({ kind: "server_error", tenantId: "other", createdAt: minutesAgo(30 - i) });
    }
    await seedEvent({ kind: "server_error", tenantId: "ses", createdAt: minutesAgo(5) });
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(
      db.sqlite.prepare("select tenant_id, rule, event_count from security_alerts").all(),
    ).toEqual([{ tenant_id: "other", rule: "error_spike", event_count: 20 }]);
  });

  it("解決済みにしたあとで再発したら、未対応に戻して知らせ直す", async () => {
    await seedEvent({
      kind: "auth.no_profile",
      tenantId: "ses",
      email: "stranger@example.com",
      createdAt: minutesAgo(30),
    });
    await detectSecurityAlerts(getDb(env()), env(), minutesAgo(29), vi.fn());
    db.sqlite.exec(
      `UPDATE security_alerts SET status = 'resolved', status_changed_at = ${minutesAgo(20).getTime()}`,
    );
    // 再発が無い検査では解決済みのまま。
    await detectSecurityAlerts(getDb(env()), env(), minutesAgo(15), vi.fn());
    expect(db.sqlite.prepare("select status from security_alerts").get()).toEqual({
      status: "resolved",
    });
    await seedEvent({
      kind: "auth.no_profile",
      tenantId: "ses",
      email: "stranger@example.com",
      createdAt: minutesAgo(10),
    });
    const again = await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(again.map((a) => a.rule)).toEqual(["uninvited_identity"]);
    expect(db.sqlite.prepare("select status, event_count from security_alerts").get()).toEqual({
      status: "open",
      event_count: 2,
    });
    expect(
      (db.sqlite.prepare("select count(*) as n from notifications").get() as { n: number }).n,
    ).toBe(2);
  });

  it("サーバーエラーの急増は最後のエラーの時刻で記録し、新しいエラーが無ければ解決済みを戻さない", async () => {
    for (let i = 0; i < 20; i++) {
      await seedEvent({ kind: "server_error", tenantId: "ses", createdAt: minutesAgo(40 - i) });
    }
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    const row = db.sqlite.prepare("select last_seen_at from security_alerts").get() as {
      last_seen_at: number;
    };
    expect(row.last_seen_at).toBe(minutesAgo(21).getTime());
    db.sqlite.exec(
      `UPDATE security_alerts SET status = 'resolved', status_changed_at = ${NOW.getTime()}`,
    );
    // 同じエラーがまだ直近 1 時間の窓にあるうちに検査しても、解決済みのまま (時の境目をまたいでも 1 件)。
    const later = new Date(NOW.getTime() + 15 * 60_000);
    expect(await detectSecurityAlerts(getDb(env()), env(), later, vi.fn())).toEqual([]);
    expect(
      db.sqlite.prepare("select count(*) as n, max(status) as s from security_alerts").get(),
    ).toEqual({
      n: 1,
      s: "resolved",
    });
  });

  it("日付が変わった直後の検査でも、新しい出来事の無い連続は別のアラートにしない", async () => {
    // 日本時間 23:50〜23:55 に 403 が 20 回。
    const beforeMidnight = new Date("2026-10-12T14:50:00.000Z");
    for (let i = 0; i < 20; i++) {
      await seedEvent({
        kind: "authz.forbidden",
        tenantId: "ses",
        actorId: "learner",
        createdAt: new Date(beforeMidnight.getTime() + i * 15_000),
      });
    }
    await detectSecurityAlerts(getDb(env()), env(), new Date("2026-10-12T14:56:00.000Z"), vi.fn());
    // 日本時間 0:05 の検査 (直近 1 時間の窓にはまだ同じ 20 回がある)。
    const after = await detectSecurityAlerts(
      getDb(env()),
      env(),
      new Date("2026-10-12T15:05:00.000Z"),
      vi.fn(),
    );
    expect(after).toEqual([]);
    expect(
      (
        db.sqlite
          .prepare("select count(*) as n from security_alerts where rule = 'forbidden_burst'")
          .get() as { n: number }
      ).n,
    ).toBe(1);
  });

  it("通知を途中まで入れたあとの送り直しでも、同じ管理者に重ねて知らせない", async () => {
    db.sqlite.exec(`
      INSERT INTO security_alerts (id, tenant_id, rule, severity, status, title, detail, subject, dedupe_key, event_count, first_seen_at, last_seen_at, notified_at, created_at) VALUES
        ('half', 'ses', 'disabled_account_access', 'high', 'open', '無効化済み', '{}', 'gone', 'k-half', 1, ${minutesAgo(20).getTime()}, ${minutesAgo(20).getTime()}, null, ${minutesAgo(20).getTime()});
      INSERT INTO notifications (id, user_id, tenant_id, type, title, body, payload, read, created_at) VALUES
        ('security-alert:half:${minutesAgo(20).getTime()}:admin', 'admin', 'ses', 'security_alert', 't', 'b', '{}', 0, 1);
    `);
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(
      (db.sqlite.prepare("select count(*) as n from notifications").get() as { n: number }).n,
    ).toBe(1);
  });

  it("前の検査で知らせ損ねたアラートは、次の検査で知らせ直す", async () => {
    db.sqlite.exec(`
      INSERT INTO security_alerts (id, tenant_id, rule, severity, status, title, detail, subject, dedupe_key, event_count, first_seen_at, last_seen_at, notified_at, created_at) VALUES
        ('unsent', 'ses', 'disabled_account_access', 'high', 'open', '無効化済み', '{}', 'gone', 'k-unsent', 1, ${minutesAgo(20).getTime()}, ${minutesAgo(20).getTime()}, null, ${minutesAgo(20).getTime()}),
        ('low', 'ses', 'off_hours_admin', 'low', 'open', '深夜', '{}', 'admin', 'k-low', 1, ${minutesAgo(20).getTime()}, ${minutesAgo(20).getTime()}, null, ${minutesAgo(20).getTime()}),
        ('done', 'ses', 'disabled_account_access', 'high', 'resolved', '解決済み', '{}', 'x', 'k-done', 1, ${minutesAgo(20).getTime()}, ${minutesAgo(20).getTime()}, null, ${minutesAgo(20).getTime()});
    `);
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(
      db.sqlite
        .prepare("select json_extract(payload, '$.alert_id') as id from notifications")
        .all(),
    ).toEqual([{ id: "unsent" }]);
    expect(
      db.sqlite
        .prepare("select notified_at is not null as sent from security_alerts where id = 'unsent'")
        .get(),
    ).toEqual({ sent: 1 });
    // 知らせたら、次の検査では送らない。
    await detectSecurityAlerts(getDb(env()), env(), new Date(NOW.getTime() + 15 * 60_000), vi.fn());
    expect(
      (db.sqlite.prepare("select count(*) as n from notifications").get() as { n: number }).n,
    ).toBe(1);
  });

  it("管理者権限の付与と復帰を監査ログから拾う", async () => {
    db.sqlite.exec(`
      INSERT INTO audit_logs (id, tenant_id, actor_id, actor_name, actor_role, action, target_type, target_id, ip, metadata, created_at) VALUES
        ('a1', 'ses', 'admin', '管理者', 'admin', 'user_role_change', 'user', 'learner', null, '{"new_role":"admin","previous_role":"student"}', ${minutesAgo(5).getTime()}),
        ('a2', 'ses', 'admin', '管理者', 'admin', 'user_role_change', 'user', 'learner', null, '{"new_role":"instructor"}', ${minutesAgo(4).getTime()}),
        ('a3', 'ses', 'admin', '管理者', 'admin', 'user_enable', 'user', 'learner', null, '{}', ${minutesAgo(3).getTime()}),
        ('a4', 'ses', 'admin', '管理者', 'admin', 'user_invite', 'user', 'new-admin', null, '{"email":"new@example.test","role":"admin"}', ${minutesAgo(2).getTime()}),
        ('a5', 'ses', 'admin', '管理者', 'admin', 'user_invite', 'user', 'new-learner', null, '{"email":"l@example.test","role":"student"}', ${minutesAgo(1).getTime()});
    `);
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    // 生徒としての招待は拾わない。
    expect(
      alerts()
        .map((a) => `${a.rule}:${a.severity}:${a.subject}`)
        .sort(),
    ).toEqual([
      "privilege_grant:high:learner",
      "privilege_grant:high:new-admin",
      "privilege_grant:medium:learner",
    ]);
  });

  it("Webhook には個人の情報を載せず、種類・重要度・件数と画面への案内だけを送る", async () => {
    await seedEvent({
      kind: "auth.no_profile",
      tenantId: "ses",
      email: "stranger@example.com",
      ip: "192.0.2.7",
      createdAt: minutesAgo(1),
    });
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("ok"));
    await detectSecurityAlerts(
      getDb(env()),
      env({ SECURITY_ALERT_WEBHOOK_URL: "https://hooks.example.com/x" }),
      NOW,
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = String(fetchImpl.mock.calls[0]?.[1]?.body);
    expect(body).toContain("未招待の利用者が Access を通過");
    expect(body).toContain("https://stella.example.com/admin/security");
    expect(body).not.toContain("stranger@example.com");
    expect(body).not.toContain("192.0.2.7");
  });

  it("Webhook に届かなければ知らせ済みにせず、次の検査で送り直す", async () => {
    await seedEvent({
      kind: "auth.no_profile",
      tenantId: "ses",
      email: "stranger@example.com",
      createdAt: minutesAgo(1),
    });
    const hook = env({ SECURITY_ALERT_WEBHOOK_URL: "https://hooks.example.com/x" });
    const failing = vi.fn<typeof fetch>(async () => new Response("down", { status: 503 }));
    await detectSecurityAlerts(getDb(hook), hook, NOW, failing);
    expect(alerts()).toEqual([expect.objectContaining({ notified_at: null })]);

    const ok = vi.fn<typeof fetch>(async () => new Response("ok"));
    await detectSecurityAlerts(getDb(hook), hook, new Date(NOW.getTime() + 15 * 60_000), ok);
    expect(ok).toHaveBeenCalledTimes(1);
    expect(String(ok.mock.calls[0]?.[1]?.body)).toContain("未招待の利用者が Access を通過");
    expect(alerts()).toEqual([expect.objectContaining({ notified_at: expect.any(Number) })]);
    // アプリ内の通知は送り直しても重ならない。
    expect(
      (db.sqlite.prepare("select count(*) as n from notifications").get() as { n: number }).n,
    ).toBe(1);
  });

  it("上限の行がすべて同じ時刻でも、検査のカーソルは先へ進む", async () => {
    const start = minutesAgo(30).getTime();
    db.sqlite.exec(
      `INSERT INTO security_state (key, value, updated_at) VALUES ('detect_cursor', '${start}', 1)`,
    );
    const insert = db.sqlite.prepare(
      "INSERT INTO security_events (id, tenant_id, kind, source, email, metadata, created_at) VALUES (?, 'ses', 'auth.no_profile', 'app', 'flood@example.com', '{}', ?)",
    );
    for (let i = 0; i < 5000; i++) insert.run(`flood-${i}`, start + 1);
    insert.run("later", minutesAgo(1).getTime());
    insert.run("later-2", minutesAgo(1).getTime());
    const cursor = () =>
      Number(
        (
          db.sqlite
            .prepare("select value from security_state where key = 'detect_cursor'")
            .get() as {
            value: string;
          }
        ).value,
      );
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(cursor()).toBe(start + 1);
    await detectSecurityAlerts(getDb(env()), env(), NOW, vi.fn());
    expect(cursor()).toBe(NOW.getTime());
  });

  it("重要度「低」(深夜帯の管理者サインイン) は画面にだけ出して通知しない", async () => {
    const lateNight = new Date("2026-10-11T17:30:00.000Z"); // 日本時間 2:30
    await seedEvent({
      kind: "session.start",
      tenantId: "ses",
      actorId: "admin",
      actorRole: "admin",
      createdAt: lateNight,
    });
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("ok"));
    await detectSecurityAlerts(
      getDb(env({ SECURITY_ALERT_WEBHOOK_URL: "https://hooks.example.com/x" })),
      env({ SECURITY_ALERT_WEBHOOK_URL: "https://hooks.example.com/x" }),
      new Date(lateNight.getTime() + 60_000),
      fetchImpl,
    );
    expect(alerts()).toEqual([
      expect.objectContaining({ rule: "off_hours_admin", severity: "low", notified_at: null }),
    ]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(jstDate(lateNight)).toBe("2026-10-12");
  });
});

describe("Cloudflare Access との連携", () => {
  const cfEnv = () => env({ CF_ACCESS_API_TOKEN: "cf-token", CLOUDFLARE_ACCOUNT_ID: "acct" });

  it("Access のログを取り込み、同じ Ray ID は二重に入れない", async () => {
    const reply = {
      success: true,
      result: [
        {
          ray_id: "r1",
          user_email: "Learner@example.test",
          ip_address: "203.0.113.1",
          allowed: true,
          created_at: minutesAgo(10).toISOString(),
          country: "jp",
          app_domain: "stella.example.com",
        },
        {
          ray_id: "r2",
          user_email: "attacker@example.com",
          ip_address: "192.0.2.1",
          allowed: false,
          created_at: minutesAgo(5).toISOString(),
          app_domain: "stella.example.com/api/me",
        },
        {
          // 同じアカウントの別の Access アプリのログは取り込まない。
          ray_id: "r3",
          user_email: "someone@other.example",
          ip_address: "192.0.2.3",
          allowed: false,
          created_at: minutesAgo(4).toISOString(),
          app_domain: "other-app.example.com",
        },
      ],
    };
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(reply)));
    expect(await importAccessLogs(cfEnv(), getDb(cfEnv()), fetchImpl, NOW)).toEqual({
      imported: 2,
    });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain("/accounts/acct/access/logs/access_requests?since=");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer cf-token");
    expect(
      await importAccessLogs(cfEnv(), getDb(cfEnv()), fetchImpl, new Date(NOW.getTime() + 1000)),
    ).toEqual({ imported: 0 });
    expect(
      db.sqlite
        .prepare("select kind, email, country, tenant_id from security_events order by created_at")
        .all(),
    ).toEqual([
      { kind: "access.login", email: "learner@example.test", country: "JP", tenant_id: "ses" },
      { kind: "access.denied", email: "attacker@example.com", country: null, tenant_id: "ses" },
    ]);
  });

  it("取り込んだログはメールアドレスの持ち主の組織に入れる (既定の組織に寄せない)", async () => {
    db.sqlite.exec(`
      INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('other', 'Other', 0, 1, 0, 1, 1);
      INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
        ('o1', 'other', 'student', 'O1', 'o1@other.example', 0, 'invite', 1);
    `);
    const reply = {
      success: true,
      result: [
        {
          ray_id: "t1",
          user_email: "O1@other.example",
          allowed: false,
          created_at: minutesAgo(3).toISOString(),
          app_domain: "stella.example.com",
        },
        {
          ray_id: "t2",
          user_email: "nobody@example.com",
          allowed: false,
          created_at: minutesAgo(2).toISOString(),
          app_domain: "stella.example.com",
        },
      ],
    };
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(reply)));
    await importAccessLogs(cfEnv(), getDb(cfEnv()), fetchImpl, NOW);
    expect(
      db.sqlite
        .prepare("select external_id, tenant_id from security_events order by external_id")
        .all(),
    ).toEqual([
      { external_id: "t1", tenant_id: "other" },
      { external_id: "t2", tenant_id: "ses" },
    ]);
  });

  it("同じ時刻の行だけでページが埋まっても、次の取り込みで先へ進む", async () => {
    const at = minutesAgo(30).toISOString();
    const full = {
      success: true,
      result: Array.from({ length: 1000 }, (_, i) => ({
        ray_id: `same-${i}`,
        user_email: "a@example.com",
        allowed: false,
        created_at: at,
        app_domain: "stella.example.com",
      })),
    };
    db.sqlite.exec(
      `INSERT INTO security_state (key, value, updated_at) VALUES ('access_logs_cursor', '${Date.parse(at)}', 1)`,
    );
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(full)));
    await importAccessLogs(cfEnv(), getDb(cfEnv()), fetchImpl, NOW);
    const cursor = db.sqlite
      .prepare("select value from security_state where key = 'access_logs_cursor'")
      .get() as { value: string };
    expect(Number(cursor.value)).toBe(Date.parse(at) + 1);
  });

  it("同じ窓をページ番号で読み切る (同じ時刻の行が 1000 件を超えても取りこぼさない)", async () => {
    const at = minutesAgo(30).toISOString();
    const row = (i: number) => ({
      ray_id: `p-${i}`,
      user_email: "a@example.com",
      allowed: false,
      created_at: at,
      app_domain: "stella.example.com",
    });
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const pageNo = Number(new URL(String(input)).searchParams.get("page"));
      const result =
        pageNo === 1 ? Array.from({ length: 1000 }, (_, i) => row(i)) : [row(1000), row(1001)];
      return new Response(JSON.stringify({ success: true, result }));
    });
    expect(await importAccessLogs(cfEnv(), getDb(cfEnv()), fetchImpl, NOW)).toEqual({
      imported: 1002,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const cursor = db.sqlite
      .prepare("select value from security_state where key = 'access_logs_cursor'")
      .get() as { value: string };
    expect(Number(cursor.value)).toBe(NOW.getTime());
  });

  it("STELLA のホスト名が分からなければ何も取り込まない", async () => {
    const reply = {
      success: true,
      result: [
        {
          ray_id: "x",
          user_email: "a@example.com",
          created_at: minutesAgo(1).toISOString(),
          app_domain: "stella.example.com",
        },
      ],
    };
    const noHost = { ...cfEnv(), ALLOWED_ORIGINS: "", INVITE_REDIRECT_URL: undefined } as Env;
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(reply)));
    expect(await importAccessLogs(noHost, getDb(noHost), fetchImpl, NOW)).toEqual({ imported: 0 });
  });

  it("トークンが無ければ何もしない", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    expect(await importAccessLogs(env(), getDb(env()), fetchImpl, NOW)).toBeNull();
    expect(await revokeAccessSessions(env(), "a@example.com", fetchImpl)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("セッションの失効はメールアドレスを送り、失敗は例外にする", async () => {
    const ok = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ success: true, result: true })),
    );
    expect(await revokeAccessSessions(cfEnv(), "learner@example.test", ok)).toBe(true);
    expect(String(ok.mock.calls[0]?.[0])).toContain(
      "/accounts/acct/access/organizations/revoke_user",
    );
    expect(JSON.parse(String(ok.mock.calls[0]?.[1]?.body))).toEqual({
      email: "learner@example.test",
    });
    const ng = vi.fn<typeof fetch>(async () => new Response("denied", { status: 403 }));
    await expect(revokeAccessSessions(cfEnv(), "learner@example.test", ng)).rejects.toThrow(
      /HTTP 403/,
    );
  });
});

describe("purgeExpiredVscodeLinks", () => {
  it("期限の過ぎた接続コードから Access のトークンを消し、1 日たった行は消す", async () => {
    db.sqlite.exec(`
      INSERT INTO auth_vscode_links (id, user_id, code_hash, expires_at, used_at, access_token, created_at) VALUES
        ('live', 'learner', 'h1', ${NOW.getTime() + 60_000}, null, 'tok-live', 1),
        ('expired', 'learner', 'h2', ${NOW.getTime() - 60_000}, null, 'tok-expired', 1),
        ('old', 'learner', 'h3', ${NOW.getTime() - 2 * 86_400_000}, null, 'tok-old', 1);
    `);
    await purgeExpiredVscodeLinks(getDb(env()), NOW);
    expect(
      db.sqlite.prepare("select id, access_token from auth_vscode_links order by id").all(),
    ).toEqual([
      { id: "expired", access_token: null },
      { id: "live", access_token: "tok-live" },
    ]);
  });
});

describe("purgeOldSecurityEvents", () => {
  it("保存期間 (180 日) を過ぎた出来事だけ消す", async () => {
    await seedEvent({
      kind: "server_error",
      tenantId: "ses",
      createdAt: new Date(NOW.getTime() - 181 * 86_400_000),
    });
    await seedEvent({
      kind: "server_error",
      tenantId: "ses",
      createdAt: new Date(NOW.getTime() - 179 * 86_400_000),
    });
    await purgeOldSecurityEvents(getDb(env()), NOW);
    expect(
      (db.sqlite.prepare("select count(*) as n from security_events").get() as { n: number }).n,
    ).toBe(1);
  });
});
