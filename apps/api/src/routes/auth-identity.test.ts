import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { authRoute } from "./auth.js";
import { meRoute } from "./me.js";
import { supportRoute } from "./support.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { resetClerkApiKeyCache, VSCODE_API_KEY_SCOPE } from "../lib/clerk-auth.js";
import { resetSecurityEventThrottle, resetSessionCache } from "../lib/security-events.js";
import type { Env } from "../env.js";
import {
  setupAccessFixture,
  TEST_ACCESS_AUD,
  TEST_TEAM_DOMAIN,
  type AccessFixture,
} from "../testing/access-fixture.js";
import {
  setupClerkFixture,
  TEST_STAFF_ORIGIN,
  TEST_WEB_ORIGIN,
  type ClerkFixture,
} from "../testing/clerk-fixture.js";
import { json, mountTestApp } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

/**
 * Clerk に移したあとの認証 (lib/authz.ts の resolveIdentity / getCaller / assertStaffAccess)。
 * 本番は Clerk のトークンだけを信じ、講師・管理者は Access で守った入口を通ったときだけ通す。
 * 開発用トークンは Clerk が無いローカルでだけ通す。
 */

// Clerk の Backend API (API キー) は、ここで差し替える (セッショントークンの検証は本物を使う)。
const clerkApi = {
  apiKeys: {
    create: vi.fn(),
    verify: vi.fn(),
    list: vi.fn(),
    revoke: vi.fn(),
  },
};
vi.mock("@clerk/backend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@clerk/backend")>()),
  createClerkClient: () => clerkApi,
}));

let clerk: ClerkFixture;
let access: AccessFixture;
beforeAll(async () => {
  clerk = await setupClerkFixture();
  access = await setupAccessFixture();
});
afterAll(() => access.restore());

let db: ReturnType<typeof sqliteD1>;
beforeEach(() => {
  resetSecurityEventThrottle();
  resetSessionCache();
  resetClerkApiKeyCache();
  for (const fn of Object.values(clerkApi.apiKeys)) fn.mockReset();
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES
      ('ses', 'SES', 0, 1, 0, 1, 1), ('closed', 'Closed', 0, 0, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 'learner@example.test', 0, 'invite', 1),
      ('teacher', 'ses', 'instructor', '講師', 'teacher@example.test', 0, 'invite', 1),
      ('gone', 'ses', 'student', '退職者', 'gone@example.test', 1, 'invite', 1),
      ('closed-user', 'closed', 'student', '停止組織', 'closed@example.test', 0, 'invite', 1);
  `);
});
afterEach(() => db.sqlite.close());

const SECRET = "auth-identity-test-secret";
const clerkEnv = (extra: Partial<Env> = {}) =>
  ({
    DB: db.binding,
    CLERK_SECRET_KEY: "sk_test_fixture",
    CLERK_JWT_KEY: clerk.jwtKey,
    ALLOWED_ORIGINS: TEST_WEB_ORIGIN,
    STAFF_ORIGIN: TEST_STAFF_ORIGIN,
    ACCESS_TEAM_DOMAIN: TEST_TEAM_DOMAIN,
    ACCESS_AUD: TEST_ACCESS_AUD,
    // Clerk が設定されていれば、開発用の鍵があっても使わない。
    DEV_AUTH_JWT_SECRET: SECRET,
    ...extra,
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
  init: RequestInit & { bearer?: string; assertion?: string; host?: string } = {},
) {
  const { app } = mountTestApp(env, meRoute, authRoute, supportRoute);
  const headers = new Headers(init.headers);
  if (init.bearer) headers.set("Authorization", `Bearer ${init.bearer}`);
  if (init.assertion) headers.set("Cf-Access-Jwt-Assertion", init.assertion);
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

describe("Clerk のセッショントークンでの認証", () => {
  it("メールアドレスで招待済みのプロフィールに結び付け、セッションが変わったときだけサインインを記録する", async () => {
    const bearer = await clerk.sign({ email: "LEARNER@example.test", sid: "sess_a" });
    const res = await call(clerkEnv(), "/api/me", { bearer });
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
    // 同じセッションでトークンが更新されても (約 60 秒ごと) 記録を増やさない。
    resetSessionCache();
    await call(clerkEnv(), "/api/me", { bearer: await clerk.sign({ sid: "sess_a" }) });
    expect(events().filter((e) => e.kind === "session.start")).toHaveLength(1);
    // 別のセッション (ログインし直し・別の端末) は新しいサインイン。
    resetSessionCache();
    await call(clerkEnv(), "/api/me", { bearer: await clerk.sign({ sid: "sess_b" }) });
    expect(events().filter((e) => e.kind === "session.start")).toHaveLength(2);
  });

  it("Clerk が設定されていれば、開発用トークンは通らない", async () => {
    const bearer = await signAccessToken(SECRET, "learner", "learner@example.test");
    const res = await call(clerkEnv(), "/api/me", { bearer });
    expect(res.status).toBe(401);
    expect(JSON.parse(events()[0]?.metadata ?? "{}")).toEqual({ reason: "invalid" });
  });

  it("トークンが無ければ 401 にし、認証なしとして記録する", async () => {
    const res = await call(clerkEnv(), "/api/me");
    expect(res.status).toBe(401);
    expect(events()).toEqual([
      expect.objectContaining({
        kind: "auth.invalid_token",
        metadata: JSON.stringify({ reason: "missing" }),
      }),
    ]);
  });

  it.each([
    ["偽の署名", () => clerk.signForged()],
    ["認めていない画面 (azp) で作られた", () => clerk.sign({ azp: "https://evil.example" })],
    ["azp の無い", () => clerk.sign({ azp: null })],
    ["期限の切れた", () => clerk.sign({ expiresIn: -120 })],
    ["メールアドレスのクレームの無い", () => clerk.sign({ email: null })],
  ])("%sトークンは 401", async (_label, make) => {
    const res = await call(clerkEnv(), "/api/me", { bearer: await make() });
    expect(res.status).toBe(401);
    expect(JSON.parse(events()[0]?.metadata ?? "{}")).toEqual({ reason: "invalid" });
  });

  it("招待されていない利用者は invite_required にして、メールアドレスを記録する", async () => {
    const bearer = await clerk.sign({ email: "stranger@example.test" });
    const res = await call(clerkEnv(), "/api/me", { bearer });
    expect(res.status).toBe(403);
    expect((await json<{ error: string }>(res)).error).toBe("invite_required");
    expect(events()).toEqual([
      expect.objectContaining({ kind: "auth.no_profile", email: "stranger@example.test" }),
    ]);
  });

  it("無効化したアカウントは Clerk でログインできても拒否して記録する", async () => {
    const bearer = await clerk.sign({ email: "gone@example.test" });
    const res = await call(clerkEnv(), "/api/auth/vscode-link", { method: "POST", bearer });
    expect(res.status).toBe(403);
    expect(events()).toEqual([
      expect.objectContaining({ kind: "auth.disabled", actor_id: "gone" }),
    ]);
  });

  it("利用停止中の組織の利用者は拒否する (/api/me の閲覧・更新も)", async () => {
    const bearer = await clerk.sign({ email: "closed@example.test" });
    expect(
      (await call(clerkEnv(), "/api/auth/vscode-link", { method: "POST", bearer })).status,
    ).toBe(403);
    expect((await call(clerkEnv(), "/api/me", { bearer })).status).toBe(403);
    const update = await call(clerkEnv(), "/api/me", {
      method: "POST",
      bearer,
      body: JSON.stringify({ display_name: "書き換え" }),
    });
    expect(update.status).toBe(403);
    expect(events().map((e) => e.kind)).toEqual([
      "auth.tenant_inactive",
      "auth.tenant_inactive",
      "auth.tenant_inactive",
    ]);
    expect(
      db.sqlite.prepare("select display_name from profiles where id = 'closed-user'").get(),
    ).toEqual({ display_name: "停止組織" });
  });
});

describe("講師・管理者は Access で守った入口から", () => {
  const teacherToken = () =>
    clerk.sign({ email: "teacher@example.test", azp: TEST_STAFF_ORIGIN, sub: "user_teacher" });

  it("Access を通っていない講師のリクエストは staff_host_required にして記録する", async () => {
    const res = await call(clerkEnv(), "/api/me", { bearer: await teacherToken() });
    expect(res.status).toBe(403);
    expect((await json<{ error: string }>(res)).error).toBe("staff_host_required");
    expect(events()).toEqual([
      expect.objectContaining({
        kind: "auth.staff_host_required",
        actor_id: "teacher",
        metadata: JSON.stringify({ reason: "missing" }),
      }),
    ]);
  });

  it("Access の検証済みで同じメールアドレスなら通す", async () => {
    const res = await call(clerkEnv(), "/api/me", {
      bearer: await teacherToken(),
      assertion: await access.sign({ email: "Teacher@example.test" }),
    });
    expect(res.status).toBe(200);
  });

  it("別の人の Access のトークン・偽の署名では通さない", async () => {
    for (const [assertion, reason] of [
      [await access.sign({ email: "learner@example.test" }), "email_mismatch"],
      [await access.signForged({ email: "teacher@example.test" }), "invalid"],
    ] as const) {
      const res = await call(clerkEnv(), "/api/me", { bearer: await teacherToken(), assertion });
      expect(res.status).toBe(403);
      expect(JSON.parse(events().at(-1)?.metadata ?? "{}")).toEqual({ reason });
    }
  });

  it("受講者には Access を求めない", async () => {
    const res = await call(clerkEnv(), "/api/me", { bearer: await clerk.sign() });
    expect(res.status).toBe(200);
  });

  it("Access の無いローカル (Clerk だけ) では講師も通す", async () => {
    const env = clerkEnv({ ACCESS_TEAM_DOMAIN: undefined, ACCESS_AUD: undefined });
    expect((await call(env, "/api/me", { bearer: await teacherToken() })).status).toBe(200);
  });

  it("本番のホストで Access の設定が無ければ、講師を Clerk だけでは通さない", async () => {
    const env = clerkEnv({ ACCESS_TEAM_DOMAIN: undefined, ACCESS_AUD: undefined });
    const host = "https://stella-web.saedgewell.workers.dev";
    const res = await call(env, "/api/me", { bearer: await teacherToken(), host });
    expect(res.status).toBe(503);
    expect(JSON.parse(events().at(-1)?.metadata ?? "{}")).toEqual({
      reason: "access_unconfigured",
    });
    const learner = await call(env, "/api/me", { bearer: await clerk.sign(), host });
    expect(learner.status).toBe(200);
  });
});

describe("開発用トークン (Clerk なし)", () => {
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

  it("Clerk も開発用の鍵も無ければ 503", async () => {
    const res = await call({ DB: db.binding } as Env, "/api/me", {});
    expect(res.status).toBe(503);
  });
});

describe("VS Code の接続 (Clerk の API キー)", () => {
  const validKey = {
    id: "ak_id_1",
    subject: "user_learner",
    scopes: [VSCODE_API_KEY_SCOPE],
    claims: { email: "learner@example.test", profile_id: "learner" },
    revoked: false,
    expired: false,
  };

  it("接続コードを 1 回だけ、その利用者のスコープ付きの API キーに換える", async () => {
    clerkApi.apiKeys.create.mockResolvedValue({ ...validKey, secret: "ak_secret_value" });
    const bearer = await clerk.sign({ sub: "user_learner" });
    const issued = await call(clerkEnv(), "/api/auth/vscode-link", { method: "POST", bearer });
    expect(issued.status).toBe(200);
    const { code } = await json<{ code: string }>(issued);

    const exchanged = await call(clerkEnv(), "/api/auth/vscode-link/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    expect(exchanged.status).toBe(200);
    expect(await json<{ access_token: string }>(exchanged)).toEqual({
      access_token: "ak_secret_value",
    });
    expect(clerkApi.apiKeys.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "user_learner",
        scopes: [VSCODE_API_KEY_SCOPE],
        claims: { email: "learner@example.test", profile_id: "learner" },
        secondsUntilExpiration: 30 * 24 * 60 * 60,
      }),
    );

    const again = await call(clerkEnv(), "/api/auth/vscode-link/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    expect(again.status).toBe(401);
    expect(clerkApi.apiKeys.create).toHaveBeenCalledTimes(1);
  });

  it("アプリが発行した API キーで API を呼べる", async () => {
    clerkApi.apiKeys.verify.mockResolvedValue(validKey);
    const res = await call(clerkEnv(), "/api/me", { bearer: "ak_secret_value" });
    expect(res.status).toBe(200);
    expect((await json<{ profile: { id: string } }>(res)).profile.id).toBe("learner");
  });

  it.each([
    ["スコープの無い (利用者が Clerk で作った)", { ...validKey, scopes: [] }],
    ["取り消した", { ...validKey, revoked: true }],
    ["期限の切れた", { ...validKey, expired: true }],
    ["メールアドレスのクレームの無い", { ...validKey, claims: {} }],
  ])("%s API キーは 401", async (_label, key) => {
    clerkApi.apiKeys.verify.mockResolvedValue(key);
    expect((await call(clerkEnv(), "/api/me", { bearer: "ak_other" })).status).toBe(401);
  });

  it("Clerk の障害のときは 503 にして、キーを消させず、認証エラーとしても記録しない", async () => {
    clerkApi.apiKeys.verify.mockRejectedValue(Object.assign(new Error("down"), { status: 502 }));
    const res = await call(clerkEnv(), "/api/me", { bearer: "ak_secret_value" });
    expect(res.status).toBe(503);
    expect(events().filter((e) => e.kind === "auth.invalid_token")).toEqual([]);
  });

  it("講師・管理者には接続コードを出さず、講師のアカウントの API キーも通さない", async () => {
    const bearer = await clerk.sign({ email: "teacher@example.test", azp: TEST_STAFF_ORIGIN });
    const issued = await call(clerkEnv(), "/api/auth/vscode-link", {
      method: "POST",
      bearer,
      assertion: await access.sign({ email: "teacher@example.test" }),
    });
    expect(issued.status).toBe(403);

    clerkApi.apiKeys.verify.mockResolvedValue({
      ...validKey,
      claims: { email: "teacher@example.test" },
    });
    expect((await call(clerkEnv(), "/api/me", { bearer: "ak_teacher" })).status).toBe(403);
  });

  it("Google ログインの旧経路は 410 (廃止)", async () => {
    expect((await call(clerkEnv(), "/api/auth/google")).status).toBe(410);
  });
});

describe("問い合わせ (ログインなしでも送れる経路)", () => {
  const send = (init: RequestInit & { bearer?: string } = {}) =>
    call(clerkEnv(), "/api/support", {
      method: "POST",
      body: JSON.stringify({
        name: "受講者",
        email: "learner@example.test",
        message: "困っています",
      }),
      ...init,
    });
  const userIds = () =>
    (
      db.sqlite.prepare("select user_id from support_inquiries").all() as Array<{
        user_id: string | null;
      }>
    ).map((r) => r.user_id);

  it("ログイン中の Clerk のトークンから利用者を結び付ける", async () => {
    expect((await send({ bearer: await clerk.sign() })).status).toBe(201);
    expect(userIds()).toEqual(["learner"]);
  });

  it("トークンが無い・検証できない・無効化済みなら結び付けずに受け付ける", async () => {
    expect((await send()).status).toBe(201);
    expect((await send({ bearer: await clerk.signForged() })).status).toBe(201);
    expect((await send({ bearer: await clerk.sign({ email: "gone@example.test" }) })).status).toBe(
      201,
    );
    expect(userIds()).toEqual([null, null, null]);
  });
});
