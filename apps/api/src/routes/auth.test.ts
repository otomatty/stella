import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authRoute } from "./auth.js";
import { signAccessToken, verifyAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

/**
 * VS Code の接続コードの交換 (`POST /api/auth/vscode-link/exchange`) のレート制限。
 * 交換は認証前に叩けて、通ったコードはそのまま JWT になるので、総当たりを IP 単位で止める。
 */

const SECRET = "auth-test-secret";
let db: ReturnType<typeof sqliteD1>;

beforeEach(() => {
  db = sqliteD1();
  db.sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('ses', 'SES', 0, 1, 0, 1, 1);
    INSERT INTO auth_users (id, email, created_at) VALUES ('learner', 'learner@example.test', 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 'learner@example.test', 0, 'google', 1);
  `);
});
afterEach(() => db.sqlite.close());

/** 呼ばれた key を控え、`allow` が false の間は超過を返すリミッタ。 */
function fakeLimiter(allow: () => boolean): { limiter: RateLimit; keys: string[] } {
  const keys: string[] = [];
  const limiter = {
    limit: async ({ key }: { key: string }) => {
      keys.push(key);
      return { success: allow() };
    },
  } as unknown as RateLimit;
  return { limiter, keys };
}

function setup(limiter?: RateLimit) {
  const env = {
    DB: db.binding,
    AUTH_JWT_SECRET: SECRET,
    ...(limiter ? { AUTH_LINK_RATE_LIMITER: limiter } : {}),
  } as Env;
  const { app } = mountTestApp(env, authRoute);
  const issueCode = async (): Promise<string> => {
    const res = await request(app, env, "/api/auth/vscode-link", {
      method: "POST",
      token: await signAccessToken(SECRET, "learner", "learner@example.test"),
    });
    expect(res.status).toBe(200);
    return (await json<{ code: string }>(res)).code;
  };
  const exchange = (code: string, ip = "203.0.113.7") =>
    request(app, env, "/api/auth/vscode-link/exchange", {
      method: "POST",
      headers: { "cf-connecting-ip": ip },
      body: JSON.stringify({ code }),
    });
  return { issueCode, exchange };
}

const unusedCodes = () =>
  db.sqlite.prepare("select count(*) as n from auth_vscode_links where used_at is null").get() as {
    n: number;
  };

describe("POST /api/auth/vscode-link/exchange のレート制限", () => {
  it("超過したら 429 を返し、有効なコードを消費しない", async () => {
    let allow = false;
    const { limiter } = fakeLimiter(() => allow);
    const { issueCode, exchange } = setup(limiter);
    const code = await issueCode();

    const limited = await exchange(code);
    expect(limited.status).toBe(429);
    expect(await json<Record<string, unknown>>(limited)).not.toHaveProperty("access_token");
    expect(unusedCodes().n).toBe(1);

    // 制限が解けたら同じコードで接続できる (超過したリクエストは何も変えていない)。
    allow = true;
    const ok = await exchange(code);
    expect(ok.status).toBe(200);
    const { access_token } = await json<{ access_token: string }>(ok);
    expect((await verifyAccessToken(SECRET, access_token)).sub).toBe("learner");
    expect(unusedCodes().n).toBe(0);
  });

  it("呼び出し元の IP ごとに数える", async () => {
    const { limiter, keys } = fakeLimiter(() => true);
    const { exchange } = setup(limiter);
    await exchange("WRONGCODE", "198.51.100.1");
    await exchange("WRONGCODE", "198.51.100.2");
    expect(keys).toEqual(["198.51.100.1", "198.51.100.2"]);
  });

  it("制限内なら従来どおり: 誤ったコードは 401、使用済みのコードも 401", async () => {
    const { limiter } = fakeLimiter(() => true);
    const { issueCode, exchange } = setup(limiter);
    expect((await exchange("WRONGCODE")).status).toBe(401);
    const code = await issueCode();
    expect((await exchange(code)).status).toBe(200);
    expect((await exchange(code)).status).toBe(401);
  });

  it("バインディングが無い環境 (ローカル・テスト) では制限しない", async () => {
    const { issueCode, exchange } = setup();
    expect((await exchange(await issueCode())).status).toBe(200);
  });
});

describe("Better Auth (本番の経路)", () => {
  const WEB = "https://web.example.test";
  function prodEnv(): Env {
    return {
      DB: db.binding,
      AUTH_JWT_SECRET: SECRET,
      BETTER_AUTH_SECRET: "better-auth-test-secret-with-enough-length",
      BETTER_AUTH_URL: WEB,
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      ALLOWED_ORIGINS: WEB,
    } as Env;
  }

  it("VS Code の接続コードはセッションになり、Bearer で使え、消せばすぐ使えなくなる", async () => {
    const env = prodEnv();
    const { app } = mountTestApp(env, authRoute);
    const devToken = await signAccessToken(SECRET, "learner", "learner@example.test");
    const issued = await request(app, env, "/api/auth/vscode-link", {
      method: "POST",
      token: devToken,
    });
    const { code } = await json<{ code: string }>(issued);
    const exchanged = await request(app, env, "/api/auth/vscode-link/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    expect(exchanged.status).toBe(200);
    const { access_token } = await json<{ access_token: string }>(exchanged);
    expect(access_token.split(".")).toHaveLength(1); // a session token, not a JWT
    expect(
      db.sqlite.prepare("select user_id from auth_sessions where token = ?").get(access_token),
    ).toEqual({ user_id: "learner" });

    // The extension calls the production host with the token.
    const use = () =>
      request(app, env, `${WEB}/api/auth/vscode-link`, { method: "POST", token: access_token });
    expect((await use()).status).toBe(200);
    db.sqlite.exec("DELETE FROM auth_sessions");
    expect((await use()).status).toBe(401);
  });

  it("ログインの行 (auth_users) の無いプロフィールの接続コードは 500 にせず無効にする", async () => {
    db.sqlite.exec(`
      INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
        ('seed-only', 'ses', 'student', 'seed', 'seed@example.test', 0, 'google', 1);
    `);
    const env = prodEnv();
    const { app } = mountTestApp(env, authRoute);
    const issued = await request(app, env, "/api/auth/vscode-link", {
      method: "POST",
      token: await signAccessToken(SECRET, "seed-only", "seed@example.test"),
    });
    const { code } = await json<{ code: string }>(issued);
    const exchanged = await request(app, env, "/api/auth/vscode-link/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    expect(exchanged.status).toBe(401);
  });

  it("本番のホストでは開発用トークンを受け付けない", async () => {
    const env = prodEnv();
    const { app } = mountTestApp(env, authRoute);
    const res = await request(app, env, `${WEB}/api/auth/vscode-link`, {
      method: "POST",
      token: await signAccessToken(SECRET, "learner", "learner@example.test"),
    });
    expect(res.status).toBe(401);
  });

  it("Google ログインは Better Auth が始め、旧 Google ログインの入口は 410", async () => {
    const env = prodEnv();
    const { app } = mountTestApp(env, authRoute);
    const start = await request(app, env, `${WEB}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { Origin: WEB },
      body: JSON.stringify({ provider: "google", callbackURL: `${WEB}/auth/callback` }),
    });
    expect(start.status).toBe(200);
    const { url } = await json<{ url: string }>(start);
    const google = new URL(url);
    expect(google.hostname).toBe("accounts.google.com");
    expect(google.searchParams.get("redirect_uri")).toBe(`${WEB}/api/auth/callback/google`);
    expect(google.searchParams.get("state")).toBeTruthy();

    expect((await request(app, env, `${WEB}/api/auth/google`)).status).toBe(410);
    expect((await request(app, env, `${WEB}/api/auth/google/callback?code=x`)).status).toBe(410);
  });

  it("ほかのサイトへの戻り先ではログインを始めない", async () => {
    const env = prodEnv();
    const { app } = mountTestApp(env, authRoute);
    const res = await request(app, env, `${WEB}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { Origin: WEB },
      body: JSON.stringify({ provider: "google", callbackURL: "https://evil.example.test/" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("接続コードの守り", () => {
  it("無効化した利用者と停止中の組織には、接続コードを交換させない", async () => {
    const { issueCode, exchange } = setup();
    const disabledCode = await issueCode();
    db.sqlite.exec("UPDATE profiles SET disabled = 1 WHERE id = 'learner'");
    expect((await exchange(disabledCode)).status).toBe(401);

    db.sqlite.exec("UPDATE profiles SET disabled = 0 WHERE id = 'learner'");
    const suspendedCode = await issueCode();
    db.sqlite.exec("UPDATE tenants SET active = 0 WHERE id = 'ses'");
    expect((await exchange(suspendedCode)).status).toBe(401);
    // 停止中は API 自体も使えない (コードの発行も止まる)。
    const { app } = mountTestApp({ DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env, authRoute);
    const issued = await request(
      app,
      { DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env,
      "/api/auth/vscode-link",
      {
        method: "POST",
        token: await signAccessToken(SECRET, "learner", "learner@example.test"),
      },
    );
    expect(issued.status).toBe(403);
  });
});

it("プロフィールにメールが無い利用者は、ログインのメールで接続できる", async () => {
  db.sqlite.exec("UPDATE profiles SET email = NULL WHERE id = 'learner'");
  const { issueCode, exchange } = setup();
  const res = await exchange(await issueCode());
  expect(res.status).toBe(200);
  const { access_token } = await json<{ access_token: string }>(res);
  expect((await verifyAccessToken(SECRET, access_token)).email).toBe("learner@example.test");
});
