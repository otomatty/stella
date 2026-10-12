import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { securityRoute } from "./security.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { resetSecurityEventThrottle, resetSessionCache } from "../lib/security-events.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "security-route-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];

const DAY = 86_400_000;
const now = Date.now();

beforeEach(() => {
  resetSecurityEventThrottle();
  resetSessionCache();
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES
      ('ses', 'SES', 0, 1, 0, 1, 1), ('other', 'Other', 0, 1, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 'invite', ${now - 400 * DAY}),
      ('teacher', 'ses', 'instructor', '講師', 'teacher@example.test', 0, 'invite', ${now - 400 * DAY}),
      ('learner', 'ses', 'student', '受講者', 'learner@example.test', 0, 'invite', ${now - 400 * DAY}),
      ('outsider', 'other', 'student', '別組織', 'outsider@example.test', 0, 'invite', 1);
    INSERT INTO security_sessions (profile_id, tenant_id, last_issued_at, last_session_at, last_seen_at, last_ip, last_country) VALUES
      ('admin', 'ses', 1, ${now - DAY}, ${now - DAY}, '203.0.113.1', 'JP'),
      ('teacher', 'ses', 1, ${now - 200 * DAY}, ${now - 200 * DAY}, '203.0.113.2', 'JP');
    INSERT INTO security_events (id, tenant_id, kind, source, actor_id, email, ip, country, metadata, created_at) VALUES
      ('e1', 'ses', 'session.start', 'app', 'admin', 'admin@example.test', '203.0.113.1', 'JP', '{}', ${now - 3_600_000}),
      ('e2', 'ses', 'access.denied', 'access', null, 'attacker@example.com', '192.0.2.1', 'US', '{}', ${now - 1_800_000}),
      ('e3', 'other', 'access.denied', 'access', null, 'x@example.com', '192.0.2.2', 'US', '{}', ${now - 1_800_000});
    INSERT INTO security_alerts (id, tenant_id, rule, severity, status, title, detail, subject, dedupe_key, event_count, first_seen_at, last_seen_at, created_at) VALUES
      ('al1', 'ses', 'access_denied_burst', 'high', 'open', '拒否', '{}', '192.0.2.1', 'k1', 6, ${now - 1_800_000}, ${now - 1_800_000}, ${now}),
      ('al2', 'ses', 'off_hours_admin', 'low', 'resolved', '深夜', '{}', 'admin', 'k2', 1, ${now - DAY}, ${now - DAY}, ${now}),
      ('al3', 'other', 'access_denied_burst', 'high', 'open', '他組織', '{}', null, 'k3', 9, ${now}, ${now}, ${now});
  `);
  env = { DB: db.binding, DEV_AUTH_JWT_SECRET: SECRET } as Env;
  app = mountTestApp(env, securityRoute).app;
});
afterEach(() => {
  db.sqlite.close();
  vi.unstubAllGlobals();
});

const token = (id: string) => signAccessToken(SECRET, id, `${id}@example.test`);
const get = async (path: string, as = "admin") =>
  request(app, env, path, { token: await token(as) });

describe("権限", () => {
  it.each(["teacher", "learner"])("管理者以外 (%s) は 403", async (who) => {
    for (const path of [
      "/api/security/overview",
      "/api/security/alerts",
      "/api/security/events",
      "/api/security/accounts",
    ]) {
      expect((await get(path, who)).status).toBe(403);
    }
  });
});

describe("GET /api/security/overview", () => {
  it("自分の組織の件数と設定の状態だけを返す", async () => {
    const res = await get("/api/security/overview");
    expect(res.status).toBe(200);
    const body = await json<{
      open_alerts: Record<string, number>;
      last24h: Record<string, number>;
      accounts: Record<string, number>;
      config: Record<string, unknown>;
      daily: unknown[];
    }>(res);
    expect(body.open_alerts).toEqual({ high: 1, medium: 0, low: 0 });
    expect(body.last24h).toEqual({ "session.start": 1, "access.denied": 1 });
    expect(body.accounts).toMatchObject({
      total: 3,
      privileged: 2,
      admins: 1,
      dormant_privileged: 1,
    });
    expect(body.config).toMatchObject({
      access_enforced: false,
      session_revoke: false,
      webhook: false,
      retention_days: 180,
    });
    expect(body.daily).toHaveLength(7);
  });
});

describe("アラート", () => {
  it("既定は未対応と確認中だけ。別の組織のアラートは見えない", async () => {
    const rows = (await json<{ rows: Array<{ id: string }> }>(await get("/api/security/alerts")))
      .rows;
    expect(rows.map((r) => r.id)).toEqual(["al1"]);
    const all = (
      await json<{ rows: Array<{ id: string }> }>(await get("/api/security/alerts?status=all"))
    ).rows;
    expect(all.map((r) => r.id).sort()).toEqual(["al1", "al2"]);
  });

  it("状態とメモを変え、監査ログに残す。別の組織のアラートは 404", async () => {
    const patch = async (id: string, body: unknown) =>
      request(app, env, `/api/security/alerts/${id}`, {
        token: await token("admin"),
        method: "PATCH",
        body: JSON.stringify(body),
      });
    expect((await patch("al1", { status: "resolved", note: "本人の出張" })).status).toBe(200);
    expect(
      db.sqlite
        .prepare("select status, note, status_changed_by from security_alerts where id = 'al1'")
        .get(),
    ).toEqual({
      status: "resolved",
      note: "本人の出張",
      status_changed_by: "管理者",
    });
    expect(db.sqlite.prepare("select action from audit_logs").all()).toEqual([
      { action: "security_alert_update" },
    ]);
    expect((await patch("al3", { status: "resolved" })).status).toBe(404);
    expect((await patch("al1", { status: "deleted" })).status).toBe(400);
  });
});

describe("GET /api/security/events", () => {
  it("種類・検索で絞れ、別の組織の出来事は返さない", async () => {
    const all = (
      await json<{ rows: Array<{ id: string; actor_name: string | null }> }>(
        await get("/api/security/events?days=1"),
      )
    ).rows;
    expect(all.map((r) => r.id)).toEqual(["e2", "e1"]);
    expect(all.find((r) => r.id === "e1")?.actor_name).toBe("管理者");
    const denied = (
      await json<{ rows: Array<{ id: string }> }>(
        await get("/api/security/events?kind=access.denied"),
      )
    ).rows;
    expect(denied.map((r) => r.id)).toEqual(["e2"]);
    const searched = (
      await json<{ rows: Array<{ id: string }> }>(await get("/api/security/events?q=attacker"))
    ).rows;
    expect(searched.map((r) => r.id)).toEqual(["e2"]);
    expect((await get("/api/security/events?kind=bogus")).status).toBe(400);
  });
});

describe("アカウントの棚卸し", () => {
  it("権限のあるアカウントを先に並べ、90 日サインインの無いものを休眠にする", async () => {
    const rows = (
      await json<{
        rows: Array<{ id: string; privileged: boolean; dormant: boolean; sessions_30d: number }>;
      }>(await get("/api/security/accounts"))
    ).rows;
    expect(rows.map((r) => r.id)).toEqual(["teacher", "admin", "learner"]);
    expect(rows.find((r) => r.id === "teacher")).toMatchObject({ privileged: true, dormant: true });
    expect(rows.find((r) => r.id === "admin")).toMatchObject({ dormant: false, sessions_30d: 1 });
  });

  it("Access のセッションの失効は、設定が無ければ 503、あれば Cloudflare に送って記録する", async () => {
    const revoke = async (id: string) =>
      request(app, env, `/api/security/accounts/${id}/revoke`, {
        token: await token("admin"),
        method: "POST",
      });
    expect((await revoke("learner")).status).toBe(503);

    env = { ...env, CF_ACCESS_API_TOKEN: "cf", CLOUDFLARE_ACCOUNT_ID: "acct" } as Env;
    app = mountTestApp(env, securityRoute).app;
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ success: true })),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect((await revoke("learner")).status).toBe(200);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: "learner@example.test",
    });
    expect(db.sqlite.prepare("select action, target_id from audit_logs").all()).toEqual([
      { action: "security_session_revoke", target_id: "learner" },
    ]);
    expect((await revoke("outsider")).status).toBe(404);
  });
});
