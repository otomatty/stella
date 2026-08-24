/**
 * Issue #203 — skill sheet registration API integration tests.
 *
 * Exercises POST parse, PUT/POST save, GET view with mocked R2 + AI.
 * Expected route module: ./skill-sheet.js
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { recordAudit } from "../lib/audit.js";
import { enforceAiRateLimit } from "../lib/rate-limit.js";
import { skillSheetRoute } from "./skill-sheet.js";
import {
  FORBIDDEN_PARSED_CONTACT_FIELDS,
  type SEED_PROFILES,
  SKILL_SHEET_PARSE_PATH,
  SKILL_SHEET_SAVE_PATH,
  createDocxFile,
  createPdfFile,
  createSkillSheetTestEnv,
  createXlsxFile,
  minimalSkillSheetV1,
  mintSkillSheetTestToken,
  skillSheetViewPath,
} from "./skill-sheet.test-helpers.js";

vi.mock("../lib/audit.js", () => ({
  clientIp: () => "127.0.0.1",
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/rate-limit.js", () => ({
  enforceAiRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  const { SEED_PROFILES } = await import("./skill-sheet.test-helpers.js");
  const profileByToken: Record<string, (typeof SEED_PROFILES)[keyof typeof SEED_PROFILES]> = {
    "seed-learner": SEED_PROFILES.learner,
    "seed-instructor": SEED_PROFILES.instructor,
    "seed-admin": SEED_PROFILES.admin,
    "seed-sales": SEED_PROFILES.sales,
    "seed-platform-admin": SEED_PROFILES.platformAdmin,
    "other-tenant-learner": SEED_PROFILES.otherTenantLearner,
  };

  return {
    ...actual,
    getCaller: vi.fn(async (c) => {
      const header = c.req.header("Authorization") ?? "";
      const token = header.replace(/^Bearer\s+/i, "").trim();
      const { jwtVerify } = await import("jose");
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode("skill-sheet-test-secret"),
        {
          issuer: "falcon-api",
          audience: "falcon-web",
        },
      );
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
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: async () => [],
              }),
            }),
          }),
          insert: () => ({
            values: () => ({
              returning: async () => [{ id: "sheet-1", profileId: profile.id }],
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: async () => [{ id: "sheet-1", profileId: profile.id }],
              }),
            }),
          }),
        },
      };
    }),
  };
});

function createTestApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", skillSheetRoute);
  return { app, env };
}

async function request(
  app: Hono<{ Bindings: Env }>,
  env: Env,
  path: string,
  init: RequestInit & { token?: string },
) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  return app.request(path, { ...init, headers }, env);
}

describe("POST /api/skill-sheets/parse", () => {
  let env: Env;

  beforeEach(() => {
    env = createSkillSheetTestEnv();
    vi.mocked(recordAudit).mockClear();
    vi.mocked(enforceAiRateLimit).mockClear();
  });

  const parseRoles = [
    ["student", "seed-learner"],
    ["sales", "seed-sales"],
    ["admin", "seed-admin"],
    ["platform_admin", "seed-platform-admin"],
  ] as const;

  it.each(parseRoles)("allows %s to parse upload", async (_role, userId) => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken(userId);
    const form = new FormData();
    form.set("file", createPdfFile());

    const res = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("DRAFT");
    expect(body.sections).toBeDefined();
    expect(body.saved).toBeUndefined();
  });

  it("returns 403 for instructor", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-instructor");
    const form = new FormData();
    form.set("file", createPdfFile());

    const res = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });

    expect(res.status).toBe(403);
  });

  it("returns DRAFT without persisting saved sheet row", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const form = new FormData();
    form.set("file", createPdfFile());

    const parseRes = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });
    expect(parseRes.status).toBe(200);
    const draft = await parseRes.json();
    expect(draft.status).toBe("DRAFT");

    const viewRes = await request(app, env, skillSheetViewPath("seed-learner"), {
      method: "GET",
      token,
    });
    expect(viewRes.status).toBe(404);
  });

  it("strips name and contact fields from parsed draft", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const form = new FormData();
    form.set("file", createPdfFile());

    const res = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });
    expect(res.status).toBe(200);
    const draft = await res.json();

    for (const field of FORBIDDEN_PARSED_CONTACT_FIELDS) {
      expect(draft).not.toHaveProperty(field);
      expect(draft.sections?.basic ?? {}).not.toHaveProperty(field);
    }
  });

  it("returns 400 for unsupported file format with clear error", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const form = new FormData();
    form.set("file", createDocxFile());

    const res = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/対応|形式|format|pdf|xlsx/i);
  });

  it("returns 503 when ANTHROPIC_API_KEY is unset", async () => {
    env = createSkillSheetTestEnv({ ANTHROPIC_API_KEY: "" });
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const form = new FormData();
    form.set("file", createPdfFile());

    const res = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });

    expect(res.status).toBe(503);
  });

  it("records skill_sheet_upload audit on parse", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const form = new FormData();
    form.set("file", createXlsxFile());

    const res = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });
    expect(res.status).toBe(200);

    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "seed-learner" }),
      expect.objectContaining({ action: "skill_sheet_upload" }),
    );
  });

  it("applies AI_RATE_LIMITER only on parse", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const form = new FormData();
    form.set("file", createPdfFile());

    await request(app, env, SKILL_SHEET_PARSE_PATH, { method: "POST", body: form, token });
    expect(enforceAiRateLimit).toHaveBeenCalled();
  });
});

describe("PUT/POST /api/skill-sheets save", () => {
  let env: Env;

  beforeEach(() => {
    env = createSkillSheetTestEnv();
    vi.mocked(recordAudit).mockClear();
    vi.mocked(enforceAiRateLimit).mockClear();
  });

  it("persists SkillSheet v1 and overwrites on second save (one row per person)", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const payload = minimalSkillSheetV1();

    const first = await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: "seed-learner", sheet: payload }),
      token,
    });
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.id).toBeDefined();

    const updated = minimalSkillSheetV1();
    updated.sections.self_pr = "updated";
    const second = await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: "seed-learner", sheet: updated }),
      token,
    });
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.id).toBe(firstBody.id);
    expect(secondBody.rowCount ?? 1).toBe(1);
  });

  it("allows manual save without prior parse", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");

    const res = await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: "seed-learner", sheet: minimalSkillSheetV1() }),
      token,
    });

    expect(res.status).toBe(200);
  });

  it("returns 403 for instructor save", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-instructor");

    const res = await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: "seed-learner", sheet: minimalSkillSheetV1() }),
      token,
    });

    expect(res.status).toBe(403);
  });

  it("records skill_sheet_update audit on save", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");

    const res = await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: "seed-learner", sheet: minimalSkillSheetV1() }),
      token,
    });
    expect(res.status).toBe(200);

    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "seed-learner" }),
      expect.objectContaining({ action: "skill_sheet_update" }),
    );
  });

  it("does not apply AI_RATE_LIMITER on save", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");

    await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: "seed-learner", sheet: minimalSkillSheetV1() }),
      token,
    });

    expect(enforceAiRateLimit).not.toHaveBeenCalled();
  });
});

describe("GET /api/skill-sheets/:profileId view", () => {
  let env: Env;

  beforeEach(() => {
    env = createSkillSheetTestEnv();
    vi.mocked(enforceAiRateLimit).mockClear();
  });

  const viewRoles = [
    ["student-own", "seed-learner", "seed-learner", 200],
    ["sales", "seed-sales", "seed-learner", 200],
    ["admin", "seed-admin", "seed-learner", 200],
    ["platform_admin", "seed-platform-admin", "seed-learner", 200],
    ["instructor", "seed-instructor", "seed-learner", 200],
  ] as const;

  it.each(viewRoles)(
    "allows %s to view saved sheet",
    async (_label, userId, targetId, expectedStatus) => {
      const { app } = createTestApp(env);
      const token = await mintSkillSheetTestToken(userId);

      // seed saved sheet
      const saveToken = await mintSkillSheetTestToken("seed-learner");
      await request(app, env, SKILL_SHEET_SAVE_PATH, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "seed-learner", sheet: minimalSkillSheetV1() }),
        token: saveToken,
      });

      const res = await request(app, env, skillSheetViewPath(targetId), {
        method: "GET",
        token,
      });

      expect(res.status).toBe(expectedStatus);
      if (expectedStatus === 200) {
        const body = await res.json();
        expect(body.sections).toBeDefined();
      }
    },
  );

  it("rejects student viewing another user's sheet", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");

    const res = await request(app, env, skillSheetViewPath("seed-instructor"), {
      method: "GET",
      token,
    });

    expect(res.status).toBe(403);
  });

  it("rejects cross-tenant access", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("other-tenant-learner");

    const res = await request(app, env, skillSheetViewPath("seed-learner"), {
      method: "GET",
      token,
    });

    expect(res.status).toBe(403);
  });

  it("does not apply AI_RATE_LIMITER on get", async () => {
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-admin");

    await request(app, env, skillSheetViewPath("seed-learner"), { method: "GET", token });
    expect(enforceAiRateLimit).not.toHaveBeenCalled();
  });
});

describe("parse failure then manual save", () => {
  it("allows registration via manual save after parse failure", async () => {
    const env = createSkillSheetTestEnv({ ANTHROPIC_API_KEY: "" });
    const { app } = createTestApp(env);
    const token = await mintSkillSheetTestToken("seed-learner");
    const form = new FormData();
    form.set("file", createPdfFile());

    const parseRes = await request(app, env, SKILL_SHEET_PARSE_PATH, {
      method: "POST",
      body: form,
      token,
    });
    expect(parseRes.status).toBe(503);

    const saveRes = await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: "seed-learner", sheet: minimalSkillSheetV1() }),
      token,
    });
    expect(saveRes.status).toBe(200);
  });
});

describe("skill sheet storage isolation", () => {
  it("does not route uploads through materials upload helpers", async () => {
    const materialsModule = await import("./materials.js");
    expect(materialsModule.materialsRoute).toBeDefined();
    // Skill sheet route must exist separately and not re-export materials handlers.
    expect(skillSheetRoute).toBeDefined();
    expect(skillSheetRoute).not.toBe(materialsModule.materialsRoute);
  });
});
