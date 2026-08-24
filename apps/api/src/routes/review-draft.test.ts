/**
 * Issue #204 — POST /api/review-draft provider + JSON response behavior (TDD).
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { reviewDraftRoute } from "./review-draft.js";
import {
  CHAT_TEST_PROFILES,
  GATEWAY_ENV_VARS,
  createChatTestEnv,
  mintChatTestToken,
  mockReviewDraftJson,
  validReviewDraftBody,
} from "./chat.test-helpers.js";

const completeMessage = vi.hoisted(() => vi.fn());
const completeGrokMessage = vi.hoisted(() => vi.fn());

vi.mock("../lib/rate-limit.js", () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/anthropic-complete.js", () => ({
  completeMessage,
}));

vi.mock("../lib/grok-complete.js", () => ({
  completeGrokMessage,
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

function createTestApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", reviewDraftRoute);
  return app;
}

async function postReviewDraft(app: Hono<{ Bindings: Env }>, env: Env, token: string) {
  return app.request(
    "/api/review-draft",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validReviewDraftBody),
    },
    env,
  );
}

describe("POST /api/review-draft provider switch (#204)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeMessage.mockResolvedValue(JSON.stringify(mockReviewDraftJson));
    completeGrokMessage.mockResolvedValue(JSON.stringify(mockReviewDraftJson));
  });

  it("returns JSON (not SSE) via Anthropic when CHAT_PROVIDER is unset", async () => {
    const env = createChatTestEnv();
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-instructor");

    const res = await postReviewDraft(app, env, token);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Content-Type")).not.toContain("text/event-stream");
    expect(completeMessage).toHaveBeenCalled();
    expect(completeGrokMessage).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    expect(body.rubric).toHaveLength(1);
  });

  it("returns JSON via Grok gateway when CHAT_PROVIDER=grok and gateway is configured", async () => {
    const env = createChatTestEnv({
      CHAT_PROVIDER: "grok",
      CHAT_MODEL: "grok-4.6",
      ...GATEWAY_ENV_VARS,
    } as Partial<Env>);
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-instructor");

    const res = await postReviewDraft(app, env, token);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(completeGrokMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining(GATEWAY_ENV_VARS),
        model: "grok-4.6",
      }),
    );
    expect(completeMessage).not.toHaveBeenCalled();
  });

  it("returns 503 when CHAT_PROVIDER=grok but AI_GATEWAY_ID is unset", async () => {
    const env = createChatTestEnv({
      CHAT_PROVIDER: "grok",
      CHAT_MODEL: "grok-4.6",
    } as Partial<Env>);
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-instructor");

    const res = await postReviewDraft(app, env, token);
    expect(res.status).toBe(503);
    expect(completeGrokMessage).not.toHaveBeenCalled();
    expect(completeMessage).not.toHaveBeenCalled();
  });

  it("still requires staff role (403 for learners)", async () => {
    const env = createChatTestEnv();
    const app = createTestApp(env);
    const token = await mintChatTestToken("seed-learner");

    const res = await postReviewDraft(app, env, token);
    expect(res.status).toBe(403);
    expect(completeMessage).not.toHaveBeenCalled();
    expect(completeGrokMessage).not.toHaveBeenCalled();
  });
});
