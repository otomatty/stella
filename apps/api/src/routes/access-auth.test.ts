import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { authRoute } from "./auth.js";
import { meRoute } from "./me.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { resetSecurityEventThrottle, resetSessionCache } from "../lib/security-events.js";
import type { Env } from "../env.js";
import {
  setupAccessFixture,
  TEST_ACCESS_AUD,
  TEST_TEAM_DOMAIN,
  type AccessFixture,
} from "../testing/access-fixture.js";
import { json, mountTestApp } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

/**
 * Cloudflare Access に移したあとの認証 (lib/authz.ts の resolveIdentity / getCaller)。
 * 本番は Access のトークンだけを信じ、開発用トークンは Access が無いローカルでだけ通す。
 */

let fixture: AccessFixture;
beforeAll(async () => {
  fixture = await setupAccessFixture();
});
afterAll(() => fixture.restore());

let db: ReturnType<typeof sqliteD1>;
beforeEach(() => {
  resetSecurityEventThrottle();
  resetSessionCache();
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES
      ('ses', 'SES', 0, 1, 0, 1, 1), ('closed', 'Closed', 0, 0, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 'learner@example.test', 0, 'invite', 1),
      ('gone', 'ses', 'student', '退職者', 'gone@example.test', 1, 'invite', 1),
      ('closed-user', 'closed', 'student', '停止組織', 'closed@example.test', 0, 'invite', 1);
  `);
});
afterEach(() => db.sqlite.close());

const SECRET = "access-auth-test-secret";
const accessEnv = () =>
  ({
    DB: db.binding,
    ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
    ACCESS_AUD: TEST_ACCESS_AUD,
    // Access が設定されていれば、開発用の鍵があっても使わない。
    DEV_AUTH_JWT_SECRET: SECRET,
  }) as Env;

/** waitUntil で書かれる出来事を待てるようにした ExecutionContext。 */
function executionContext() {
  const pending: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil: (p: Promise<unknown>) => {
        pending.push(p);
      },
      passThroughOnException: () => undefined,
      props: {},
    } as unknown as ExecutionContext,
    flush: () => Promise.all(pending),
  };
}

async function call(
  env: Env,
  path: string,
  init: RequestInit & { assertion?: string; bearer?: string; host?: string } = {},
) {
  const { app } = mountTestApp(env, meRoute, authRoute);
  const headers = new Headers(init.headers);
  if (init.assertion) headers.set("Cf-Access-Jwt-Assertion", init.assertion);
  if (init.bearer) headers.set("Authorization", `Bearer ${init.bearer}`);
  headers.set("cf-connecting-ip", "198.51.100.9");
  headers.set("cf-ipcountry", "JP");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const exec = executionContext();
  const res = await app.request(
    `${init.host ?? "http://localhost"}${path}`,
    { ...init, headers },
    env,
    exec.ctx,
  );
  await exec.flush();
  return res;
}

const events = () =>
  db.sqlite
    .prepare(
      "select kind, email, actor_id, ip, country, metadata from security_events order by created_at",
    )
    .all() as Array<{
    kind: string;
    email: string | null;
    actor_id: string | null;
    ip: string | null;
    country: string | null;
    metadata: string;
  }>;

describe("Access のトークンでの認証", () => {
  it("メールアドレスで招待済みのプロフィールに結び付け、新しいサインインを記録する", async () => {
    const assertion = await fixture.sign({ email: "LEARNER@example.test", iat: 1_900_000_000 });
    const res = await call(accessEnv(), "/api/me", { assertion });
    expect(res.status).toBe(200);
    expect((await json<{ profile: { id: string } }>(res)).profile.id).toBe("learner");
    expect(events()).toEqual([
      expect.objectContaining({
        kind: "session.start",
        actor_id: "learner",
        ip: "198.51.100.9",
        country: "JP",
      }),
    ]);
    // 同じセッション (同じ発行時刻) では記録を増やさない。
    resetSessionCache();
    await call(accessEnv(), "/api/me", { assertion });
    expect(events().filter((e) => e.kind === "session.start")).toHaveLength(1);
  });

  it("Access が設定されていれば、開発用トークンは本番の経路で通らない", async () => {
    const bearer = await signAccessToken(SECRET, "learner", "learner@example.test");
    const res = await call(accessEnv(), "/api/me", { bearer });
    expect(res.status).toBe(401);
    expect(events()).toEqual([
      expect.objectContaining({
        kind: "auth.invalid_token",
        metadata: JSON.stringify({ reason: "missing" }),
      }),
    ]);
  });

  it("偽の署名のトークンは 401 にし、検証の失敗として記録する", async () => {
    const assertion = await fixture.signForged({ email: "learner@example.test" });
    const res = await call(accessEnv(), "/api/me", { assertion });
    expect(res.status).toBe(401);
    expect(JSON.parse(events()[0]?.metadata ?? "{}")).toEqual({ reason: "invalid" });
  });

  it("招待されていない利用者は invite_required にして、メールアドレスを記録する", async () => {
    const assertion = await fixture.sign({ email: "stranger@example.test" });
    const res = await call(accessEnv(), "/api/me", { assertion });
    expect(res.status).toBe(403);
    expect((await json<{ error: string }>(res)).error).toBe("invite_required");
    expect(events()).toEqual([
      expect.objectContaining({ kind: "auth.no_profile", email: "stranger@example.test" }),
    ]);
  });

  it("無効化したアカウントは Access を通っても拒否して記録する", async () => {
    const assertion = await fixture.sign({ email: "gone@example.test" });
    const res = await call(accessEnv(), "/api/auth/vscode-link", { method: "POST", assertion });
    expect(res.status).toBe(403);
    expect(events()).toEqual([
      expect.objectContaining({ kind: "auth.disabled", actor_id: "gone" }),
    ]);
  });

  it("利用停止中の組織の利用者は拒否する", async () => {
    const assertion = await fixture.sign({ email: "closed@example.test" });
    const res = await call(accessEnv(), "/api/auth/vscode-link", { method: "POST", assertion });
    expect(res.status).toBe(403);
    expect(events()).toEqual([expect.objectContaining({ kind: "auth.tenant_inactive" })]);
  });
});

describe("開発用トークン (Access なし)", () => {
  const devEnv = () => ({ DB: db.binding, DEV_AUTH_JWT_SECRET: SECRET }) as Env;

  it("localhost では受け付ける", async () => {
    const bearer = await signAccessToken(SECRET, "learner", "learner@example.test");
    expect((await call(devEnv(), "/api/me", { bearer })).status).toBe(200);
    expect(
      (await call(devEnv(), "/api/me", { bearer, host: "http://127.0.0.1:8787" })).status,
    ).toBe(200);
  });

  it("localhost 以外のホストでは、鍵があっても認証が未設定として止める", async () => {
    const bearer = await signAccessToken(SECRET, "learner", "learner@example.test");
    const res = await call(devEnv(), "/api/me", { bearer, host: "https://stella-web.example.com" });
    expect(res.status).toBe(503);
  });

  it("Access も開発用の鍵も無ければ 503", async () => {
    const res = await call({ DB: db.binding } as Env, "/api/me", {});
    expect(res.status).toBe(503);
  });
});

describe("VS Code の接続 (Access)", () => {
  it("接続コードは発行時の Access のトークンを 1 回だけ渡し、渡したら消す", async () => {
    const assertion = await fixture.sign({ email: "learner@example.test" });
    const issued = await call(accessEnv(), "/api/auth/vscode-link", { method: "POST", assertion });
    expect(issued.status).toBe(200);
    const { code } = await json<{ code: string }>(issued);

    const exchanged = await call(accessEnv(), "/api/auth/vscode-link/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    expect(exchanged.status).toBe(200);
    expect(await json<{ access_token: string }>(exchanged)).toEqual({ access_token: assertion });
    expect(
      db.sqlite.prepare("select access_token, used_at from auth_vscode_links").get(),
    ).toMatchObject({ access_token: null });

    const again = await call(accessEnv(), "/api/auth/vscode-link/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    expect(again.status).toBe(401);
  });

  it("Google ログインの経路は 410 (廃止)", async () => {
    expect((await call(accessEnv(), "/api/auth/google")).status).toBe(410);
  });
});
