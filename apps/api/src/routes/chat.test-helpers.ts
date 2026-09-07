/**
 * Issue #204 — chat / review-draft route test helpers.
 */

import { SignJWT } from "jose";

import type { Env } from "../env.js";

export const CHAT_TEST_JWT_SECRET = "chat-ai-gateway-test-secret";

export const CHAT_TEST_PROFILES = {
  learner: { id: "seed-learner", tenantId: "ses", role: "student" as const },
  instructor: { id: "seed-instructor", tenantId: "ses", role: "instructor" as const },
} as const;

export async function mintChatTestToken(userId: string): Promise<string> {
  return new SignJWT({ email: `${userId}@example.local` })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("stella-api")
    .setAudience("stella-web")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(CHAT_TEST_JWT_SECRET));
}

export function createChatTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    ANTHROPIC_API_KEY: "sk-test",
    ANTHROPIC_MODEL: "claude-sonnet-4-6",
    ALLOWED_ORIGINS: "http://localhost:5173",
    DB: {} as D1Database,
    AUTH_JWT_SECRET: CHAT_TEST_JWT_SECRET,
    ...overrides,
  } as Env;
}

export const validChatBody = {
  context: { kind: "general" as const },
  messages: [{ role: "user" as const, content: "Hello" }],
};

export const validReviewDraftBody = {
  assignmentTitle: "Demo assignment",
  code: "console.log('hi');",
  language: "js" as const,
};

export const GATEWAY_ENV_VARS = {
  CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
  AI_GATEWAY_ID: "stella-ai",
} as const;

export const mockReviewDraftJson = {
  notes: "AI draft notes",
  suggestions: [
    {
      id: "s1",
      line: 1,
      severity: "low" as const,
      category: "style",
      body: "Consider const",
      adopted: null,
    },
  ],
  rubric: [
    {
      id: "rb1",
      name: "機能",
      desc: "works",
      max: 4,
      score: 3,
    },
  ],
};
