import { beforeEach, describe, expect, it } from "vitest";

import { auditLogsRoute } from "./audit-logs.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { resetSecurityEventThrottle, resetSessionCache } from "../lib/security-events.js";
import type { Env } from "../env.js";
import { mountTestApp } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

const SECRET = "audit-logs-route-secret";
let db: ReturnType<typeof sqliteD1>;
let env: Env;

beforeEach(() => {
  resetSecurityEventThrottle();
  resetSessionCache();
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES
      ('ses', 'SES', 0, 1, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 'invite', 1);
  `);
  env = { DB: db.binding, DEV_AUTH_JWT_SECRET: SECRET } as Env;
});

/** waitUntil で書かれる出来事を待ってから返す。 */
async function get(path: string): Promise<Response> {
  const pending: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (p: Promise<unknown>) => {
      pending.push(p);
    },
    passThroughOnException: () => undefined,
    props: {},
  } as unknown as ExecutionContext;
  const token = await signAccessToken(SECRET, "admin", "admin@example.test");
  const { app } = mountTestApp(env, auditLogsRoute);
  const res = await app.request(path, { headers: { Authorization: `Bearer ${token}` } }, env, ctx);
  await Promise.all(pending);
  return res;
}

const exports = () =>
  db.sqlite
    .prepare("select metadata from security_events where kind = 'data.export'")
    .all() as Array<{ metadata: string }>;

describe("監査ログの CSV 書き出し", () => {
  it("書き出しの先頭ページだけを持ち出しの検知の材料に記録する", async () => {
    expect((await get("/api/audit-logs?limit=1000&offset=0&export=1")).status).toBe(200);
    expect((await get("/api/audit-logs?limit=1000&offset=1000")).status).toBe(200);
    expect(exports().map((e) => JSON.parse(e.metadata).report)).toEqual(["audit_logs"]);
  });

  it("画面で一覧を見るだけなら記録しない", async () => {
    expect((await get("/api/audit-logs?limit=500&offset=0")).status).toBe(200);
    expect(exports()).toEqual([]);
  });
});
