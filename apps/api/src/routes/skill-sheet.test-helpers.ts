/**
 * Issue #203 — skill sheet registration test contracts and mocks.
 * Expected production modules: routes/skill-sheet.ts, lib/skill-sheet-*.ts
 */

import { SignJWT } from "jose";

import type { ProfileRole } from "../lib/authz.js";
import type { Env } from "../env.js";

/** Required top-level sections in SkillSheet v1. */
export const SKILL_SHEET_V1_SECTIONS = [
  "basic",
  "skills",
  "projects",
  "certifications",
  "self_pr",
] as const;

export type SkillSheetV1Section = (typeof SKILL_SHEET_V1_SECTIONS)[number];

/** Minimal SkillSheet v1 contract (implementation: @falcon/shared/skill-sheet/types). */
export interface SkillSheetV1 {
  sections: Record<SkillSheetV1Section, unknown>;
}

/** Fields that parse MUST NOT ingest from uploaded documents. */
export const FORBIDDEN_PARSED_CONTACT_FIELDS = [
  "name",
  "fullName",
  "full_name",
  "email",
  "phone",
  "tel",
  "telephone",
  "mobile",
  "address",
  "contact",
] as const;

export const SKILL_SHEET_PARSE_PATH = "/api/skill-sheets/parse";
export const SKILL_SHEET_SAVE_PATH = "/api/skill-sheets";
export const skillSheetViewPath = (profileId: string) => `/api/skill-sheets/${profileId}`;

export const TEST_JWT_SECRET = "skill-sheet-test-secret";

export const SEED_PROFILES = {
  learner: { id: "seed-learner", tenantId: "ses", role: "student" as ProfileRole },
  instructor: { id: "seed-instructor", tenantId: "ses", role: "instructor" as ProfileRole },
  admin: { id: "seed-admin", tenantId: "ses", role: "admin" as ProfileRole },
  sales: { id: "seed-sales", tenantId: "ses", role: "sales" as ProfileRole },
  platformAdmin: {
    id: "seed-platform-admin",
    tenantId: "ses",
    role: "platform_admin" as ProfileRole,
  },
  otherTenantLearner: {
    id: "other-tenant-learner",
    tenantId: "other-tenant",
    role: "student" as ProfileRole,
  },
} as const;

export function minimalSkillSheetV1(): SkillSheetV1 {
  return {
    sections: {
      basic: {},
      skills: [],
      projects: [],
      certifications: [],
      self_pr: "",
    },
  };
}

export async function mintSkillSheetTestToken(userId: string): Promise<string> {
  return new SignJWT({ email: `${userId}@example.local` })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("falcon-api")
    .setAudience("falcon-web")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
}

export function createPdfFile(
  name = "resume.pdf",
  bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]),
): File {
  return new File([bytes], name, { type: "application/pdf" });
}

export function createXlsxFile(
  name = "resume.xlsx",
  bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
): File {
  return new File([bytes], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function createDocxFile(name = "resume.docx"): File {
  return new File([new Uint8Array([0x50, 0x4b])], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/** In-memory R2 mock for skill sheet upload tests (separate from materials helpers). */
export function createMockSkillSheetR2Bucket(): R2Bucket {
  const objects = new Map<string, ArrayBuffer>();
  return {
    head: async (key: string) => (objects.has(key) ? ({ key } as R2Object) : null),
    get: async (key: string) => {
      const body = objects.get(key);
      if (!body) return null;
      return { body, arrayBuffer: async () => body } as unknown as R2ObjectBody;
    },
    put: async (key: string, value: ArrayBuffer | ReadableStream) => {
      const buf = value instanceof ArrayBuffer ? value : await new Response(value).arrayBuffer();
      objects.set(key, buf);
    },
    delete: async (key: string) => {
      objects.delete(key);
    },
    list: async () => ({ objects: [], truncated: false }),
  } as unknown as R2Bucket;
}

export function createMockAiRateLimiter(limited = false): RateLimit {
  return {
    limit: async () => ({ success: !limited }),
  } as RateLimit;
}

export function createSkillSheetTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    ANTHROPIC_API_KEY: "test-key",
    ALLOWED_ORIGINS: "http://127.0.0.1:5173",
    DB: {} as D1Database,
    AUTH_JWT_SECRET: TEST_JWT_SECRET,
    SKILL_SHEETS_BUCKET: createMockSkillSheetR2Bucket(),
    AI_RATE_LIMITER: createMockAiRateLimiter(),
    ...overrides,
  } as Env;
}
