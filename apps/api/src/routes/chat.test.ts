/**
 * Issue #204 — POST /api/chat provider + AI Gateway behavior (TDD).
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";
import { chatRoute } from "./chat.js";
import {
  type CHAT_TEST_PROFILES,
  GATEWAY_ENV_VARS,
  createChatTestEnv,
  mintChatTestToken,
  validChatBody,
} from "./chat.test-helpers.js";

const streamChat = vi.hoisted(() => vi.fn());
const streamGrokChat = vi.hoisted(() => vi.fn());

vi.mock("../lib/rate-limit.js", () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/anthropic.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/anthropic.js")>();
  return {
    ...actual,
    streamChat,
  };
});

vi.mock("../lib/grok-chat.js", () => ({
  streamGrokChat,
}));

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  const { CHAT_TEST_PROFILES, CHAT_TEST_JWT_SECRET } = await import("./chat.test-helpers.js");
  const profileByToken: Record<
    string,
    (typeof CHAT_TEST_PROFILES)[keyof typeof CHAT_TEST_PROFILES]
  > = {
    "seed-learner": CHAT_TEST_PROFILES.learner,
    "seed-instructor": CHAT_TEST_PROFILES.instructor,
  };

  return {
    ...actual,
    getCaller: vi.fn(async (c) => {
      const header = c.req.header("Authorization") ?? "";
      const token = header.replace(/^Bearer\s+/i, "").trim();
      if (!token) throw new actual.ApiError("Authorization ヘッダが必要です", 401);
      const { jwtVerify } = await import("jose");
      const { payload } = await jwtVerify(token, new TextEncoder().encode(CHAT_TEST_JWT_SECRET), {
        issuer: "falcon-api",
        audience: "falcon-web",
      });
      const profile = profileByToken[payload.sub as string];
      if (!profile) throw new actual.ApiError("プロフィールが見つかりません", 403);
      return {
        caller: {
          id: profile.id,
          tenantId: profile.tenantId,
          role: profile.role,
          name: profile.id,
          email: null,
        },
        db: {} as never,
      };
    }),
  };
});

async function* sseEvents() {
  yield { type: "text" as const, delta: "Hi" };
  yield { type: "done" as const };
}

function createTestApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", chatRoute);
  return app;
}

async function postChat(app: Hono<{ Bindings: Env }>, env: Env, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return app.request(
    "/api/chat",
    {
      method: "POST",
      headers,
      body: JSON.stringify(validChatBody),
    },
    env,
  );
}

describe("POST /api/chat auth and rate limit (#204 baseline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamChat.mockReturnValue(sseEvents());
    streamGrokChat.mockReturnValue(sseEvents());
  });

  it("requires authentication (401 without Bearer token)", async () => {
    const env = createChatTestEnv();
    const app = createTestApp(env);
    const res = await postChat(app, env);
    expect(res.status).toBe(401);
    expect(streamChat).not.toHaveBeenCalled();
    expect(streamGrokChat).not.toHaveBeenCalled();
  });

  it("still enforces AI rate limiting before provider dispatch", async () => {
    const env = createChatTestEnv();
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-learner");
    await postChat(app, env, token);
    expect(enforceAiRateLimit).toHaveBeenCalled();
  });
});

describe("POST /api/chat provider switch (#204)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamChat.mockReturnValue(sseEvents());
    streamGrokChat.mockReturnValue(sseEvents());
  });

  it("streams SSE via Anthropic when CHAT_PROVIDER is unset", async () => {
    const env = createChatTestEnv();
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-learner");

    const res = await postChat(app, env, token);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(streamChat).toHaveBeenCalled();
    expect(streamGrokChat).not.toHaveBeenCalled();
  });

  it("streams SSE via Grok gateway when CHAT_PROVIDER=grok and gateway is configured", async () => {
    const env = createChatTestEnv({
      CHAT_PROVIDER: "grok",
      CHAT_MODEL: "grok-4.6",
      ...GATEWAY_ENV_VARS,
    } as Partial<Env>);
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-learner");

    const res = await postChat(app, env, token);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(streamGrokChat).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining(GATEWAY_ENV_VARS),
        model: "grok-4.6",
      }),
    );
    expect(streamChat).not.toHaveBeenCalled();
  });

  it("returns 503 when CHAT_PROVIDER=grok but AI_GATEWAY_ID is unset", async () => {
    const env = createChatTestEnv({
      CHAT_PROVIDER: "grok",
      CHAT_MODEL: "grok-4.6",
    } as Partial<Env>);
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-learner");

    const res = await postChat(app, env, token);
    expect(res.status).toBe(503);
    expect(streamGrokChat).not.toHaveBeenCalled();
    expect(streamChat).not.toHaveBeenCalled();
  });
});
