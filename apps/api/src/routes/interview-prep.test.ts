/**
 * Issue #205 — interview scheduled date (sales/admin register + display) TDD tests.
 *
 * Exercises PUT/GET assignment routes and learner questions payload.
 * Expected route module: ./interview-prep.js
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import { recordAudit } from "../lib/audit.js";
import { interviewPrepRoute } from "./interview-prep.js";
import { skillSheetRoute } from "./skill-sheet.js";
import {
  INTERVIEW_PREP_ASSIGNMENTS_PATH,
  INTERVIEW_PREP_MY_ANSWERS_PATH,
  INTERVIEW_PREP_QUESTIONS_PATH,
  SEED_PROFILES,
  SKILL_SHEET_SAVE_PATH,
  TEST_INTERVIEW_QUESTIONS,
  createInterviewPrepTestEnv,
  createInterviewPrepTestState,
  interviewPrepAdoptDraftPath,
  interviewPrepAnswerTemplatePath,
  interviewPrepAssignmentPath,
  interviewPrepProgressPath,
  minimalSkillSheetPayload,
  mintInterviewPrepTestToken,
  putAssignmentBody,
  type InterviewPrepTestState,
} from "./interview-prep.test-helpers.js";

vi.mock("../lib/audit.js", () => ({
  clientIp: () => "127.0.0.1",
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/authz.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/authz.js")>();
  const { SEED_PROFILES, TEST_JWT_SECRET, createInterviewPrepTestDb } = await import(
    "./interview-prep.test-helpers.js"
  );

  const profileByToken: Record<string, (typeof SEED_PROFILES)[keyof typeof SEED_PROFILES]> = {
    "seed-learner": SEED_PROFILES.learner,
    "seed-learner-b": SEED_PROFILES.learnerB,
    "seed-learner-c": SEED_PROFILES.learnerC,
    "seed-instructor": SEED_PROFILES.instructor,
    "seed-admin": SEED_PROFILES.admin,
    "seed-sales": SEED_PROFILES.sales,
    "seed-platform-admin": SEED_PROFILES.platformAdmin,
  };

  return {
    ...actual,
    getCaller: vi.fn(async (c) => {
      const header = c.req.header("Authorization") ?? "";
      const token = header.replace(/^Bearer\s+/i, "").trim();
      const { jwtVerify } = await import("jose");
      const { payload } = await jwtVerify(token, new TextEncoder().encode(TEST_JWT_SECRET), {
        issuer: "falcon-api",
        audience: "falcon-web",
      });
      const profile = profileByToken[payload.sub as string];
      if (!profile) throw new actual.ApiError("プロフィールが見つかりません", 403);

      const state = (globalThis as { __interviewPrepTestState?: InterviewPrepTestState })
        .__interviewPrepTestState;
      if (!state) throw new actual.ApiError("テスト state が未設定です", 500);

      const targetProfileId = c.req.param("profileId") || c.req.query("profileId") || undefined;
      return {
        caller: {
          id: profile.id,
          tenantId: profile.tenantId,
          role: profile.role,
          name: profile.id,
          email: null,
        },
        db: createInterviewPrepTestDb(state, {
          callerId: profile.id,
          callerTenantId: profile.tenantId,
          targetProfileId,
        }),
      };
    }),
  };
});

function createTestApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", interviewPrepRoute);
  return { app, env };
}

function createCombinedTestApp(env: Env) {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", interviewPrepRoute);
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
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return app.request(path, { ...init, headers }, env);
}

async function putAssignment(
  app: Hono<{ Bindings: Env }>,
  env: Env,
  token: string,
  profileId: string,
  body: Record<string, unknown>,
) {
  return request(app, env, interviewPrepAssignmentPath(profileId), {
    method: "PUT",
    body: JSON.stringify(body),
    token,
  });
}

describe("PUT /api/interview-prep/assignments/:profileId interview date (#205)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(() => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
    vi.mocked(recordAudit).mockClear();
  });

  const dateWriteRoles = [
    ["sales", "seed-sales"],
    ["admin", "seed-admin"],
    ["platform_admin", "seed-platform-admin"],
  ] as const;

  it.each(dateWriteRoles)("allows %s to save interviewDate and note", async (_role, userId) => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken(userId);

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({
        interviewDate: "2026-09-10",
        note: "ECサイト保守開発",
      }),
    );

    expect(res.status).toBe(200);
    const stored = state.assignments.get(`ses:${SEED_PROFILES.learner.id}`);
    expect(stored?.interviewDate).toBe("2026-09-10");
    expect(stored?.interviewNote).toBe("ECサイト保守開発");
  });

  it("returns 403 when instructor sends interviewDate", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-instructor");

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-10" }),
    );

    expect(res.status).toBe(403);
  });

  it("returns 403 when instructor sends note", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-instructor");

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ note: "案件メモ" }),
    );

    expect(res.status).toBe(403);
  });

  it("allows instructor to save categories without interviewDate or note", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-instructor");

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ categories: ["SQL"] }),
    );

    expect(res.status).toBe(200);
    const stored = state.assignments.get(`ses:${SEED_PROFILES.learner.id}`);
    expect(stored?.categories).toEqual(["SQL"]);
  });

  it("persists interviewDate and note on interview_prep_assignments", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-sales");

    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({
        interviewDate: "2026-10-01",
        note: "更新メモ",
      }),
    );

    const stored = state.assignments.get(`ses:${SEED_PROFILES.learner.id}`);
    expect(stored).toMatchObject({
      interviewDate: "2026-10-01",
      interviewNote: "更新メモ",
    });
  });

  it("creates a notification to the learner when interviewDate is set", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-sales");

    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-15", note: "面談準備" }),
    );

    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0]).toMatchObject({
      userId: SEED_PROFILES.learner.id,
      tenantId: "ses",
    });
    expect(state.notifications[0]?.title ?? state.notifications[0]?.body).toBeTruthy();
  });

  it("does not notify again when saving the same interviewDate", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-sales");

    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-15" }),
    );
    expect(state.notifications).toHaveLength(1);

    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-15", note: "更新メモ" }),
    );
    expect(state.notifications).toHaveLength(1);
  });

  it("does not notify when only note is updated", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-sales");

    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-15" }),
    );
    expect(state.notifications).toHaveLength(1);

    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ note: "メモだけ更新" }),
    );
    expect(state.notifications).toHaveLength(1);
  });

  it("returns 400 for calendar-invalid interviewDate", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-sales");

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-02-31" }),
    );

    expect(res.status).toBe(400);
    expect(state.notifications).toHaveLength(0);
  });

  it("records interviewDate in interview_prep_assign audit metadata", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-20" }),
    );
    expect(res.status).toBe(200);

    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "seed-admin" }),
      expect.objectContaining({
        action: "interview_prep_assign",
        metadata: expect.objectContaining({ interviewDate: "2026-09-20" }),
      }),
    );
  });
});

describe("GET /api/interview-prep/assignments interview date fields (#205)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(async () => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;

    const { app } = createTestApp(env);
    const salesToken = await mintInterviewPrepTestToken("seed-sales");
    await putAssignment(
      app,
      env,
      salesToken,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-10", note: "案件A" }),
    );
  });

  it("includes interviewDate and note for staff list", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-sales");

    const res = await request(app, env, INTERVIEW_PREP_ASSIGNMENTS_PATH, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find(
      (r: { profile_id: string }) => r.profile_id === SEED_PROFILES.learner.id,
    );
    expect(row).toMatchObject({
      interviewDate: "2026-09-10",
      note: "案件A",
    });
  });

  it("allows instructor to view interviewDate and note", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-instructor");

    const res = await request(app, env, INTERVIEW_PREP_ASSIGNMENTS_PATH, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find(
      (r: { profile_id: string }) => r.profile_id === SEED_PROFILES.learner.id,
    );
    expect(row?.interviewDate).toBe("2026-09-10");
    expect(row?.note).toBe("案件A");
  });

  it("sorts rows by interviewDate ascending with unset dates last", async () => {
    const { app } = createTestApp(env);
    const salesToken = await mintInterviewPrepTestToken("seed-sales");

    await putAssignment(
      app,
      env,
      salesToken,
      SEED_PROFILES.learnerB.id,
      putAssignmentBody({ interviewDate: "2026-09-05" }),
    );
    await putAssignment(
      app,
      env,
      salesToken,
      SEED_PROFILES.learnerC.id,
      putAssignmentBody({ interviewDate: "2026-09-20" }),
    );

    const token = await mintInterviewPrepTestToken("seed-admin");
    const res = await request(app, env, INTERVIEW_PREP_ASSIGNMENTS_PATH, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const dated = body.rows
      .filter((r: { interviewDate?: string | null }) => r.interviewDate)
      .map((r: { interviewDate: string }) => r.interviewDate);
    expect(dated).toEqual(["2026-09-05", "2026-09-10", "2026-09-20"]);

    const unsetRows = body.rows.filter((r: { interviewDate?: string | null }) => !r.interviewDate);
    const datedRows = body.rows.filter((r: { interviewDate?: string | null }) => r.interviewDate);
    expect(body.rows.indexOf(unsetRows[0])).toBeGreaterThan(
      body.rows.indexOf(datedRows[datedRows.length - 1]),
    );
  });
});

describe("GET /api/interview-prep/questions learner payload (#205)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(async () => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;

    const { app } = createTestApp(env);
    const salesToken = await mintInterviewPrepTestToken("seed-sales");
    await putAssignment(
      app,
      env,
      salesToken,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ interviewDate: "2026-09-10", note: "ヘッダー用メモ" }),
    );
  });

  it("includes interviewDate and note for learner header/countdown", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.interviewDate).toBe("2026-09-10");
    expect(body.note).toBe("ヘッダー用メモ");
  });
});

describe("skill sheet save triggers personal answer template generation (#206)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(async () => {
    env = createInterviewPrepTestEnv({
      ANTHROPIC_API_KEY: "test-key",
      CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
      AI_GATEWAY_ID: "falcon-ai",
    });
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;

    const { app } = createCombinedTestApp(env);
    const instructorToken = await mintInterviewPrepTestToken("seed-instructor");
    await putAssignment(
      app,
      env,
      instructorToken,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ categories: ["PHP"] }),
    );
  });

  it("enqueues generation_jobs for assigned category-A questions only on skill sheet save", async () => {
    const { app } = createCombinedTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, SKILL_SHEET_SAVE_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: SEED_PROFILES.learner.id,
        sheet: minimalSkillSheetPayload(),
      }),
      token,
    });

    expect(res.status).toBe(200);
    expect(state.generationJobs).toHaveLength(1);
    expect(state.generationJobs[0]).toMatchObject({
      tenantId: "ses",
      profileId: SEED_PROFILES.learner.id,
      status: "pending",
      requested: 1,
    });
    expect(state.generationJobs[0]?.batchId).toBeTruthy();
  });
});

describe("GET /api/interview-prep/questions personal answer templates (#206)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(async () => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;

    const { app } = createTestApp(env);
    const instructorToken = await mintInterviewPrepTestToken("seed-instructor");
    await putAssignment(
      app,
      env,
      instructorToken,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ categories: ["PHP"] }),
    );
  });

  it("returns plain common templates when no skill sheet is registered", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find((r: { no: number }) => r.no === 101);
    expect(row.answer_template).toBe("共通A: 経験年数年です");
    expect(row.personal_answer_template).toBeNull();
    expect(row.answer_template).not.toMatch(/<span class="blank">/);
  });

  it("returns personal_answer_template for assigned A questions when generated", async () => {
    state.personalTemplates.set("ses:seed-learner:101", {
      id: "tpl-101",
      tenantId: "ses",
      profileId: SEED_PROFILES.learner.id,
      questionNo: 101,
      content: "PHP 5 年、Laravel で EC 保守を担当しています",
      draftContent: null,
      generatedFrom: "sheet-1",
      source: "ai",
      updatedBy: "system",
    });
    state.skillSheets.set("ses:seed-learner", {
      id: "sheet-1",
      tenantId: "ses",
      profileId: SEED_PROFILES.learner.id,
      sheet: minimalSkillSheetPayload(),
      updatedBy: SEED_PROFILES.learner.id,
    });

    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");
    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, { method: "GET", token });

    expect(res.status).toBe(200);
    const body = await res.json();
    const rowA = body.rows.find((r: { no: number }) => r.no === 101);
    const rowB = body.rows.find((r: { no: number }) => r.no === 102);
    expect(rowA.personal_answer_template).toBe("PHP 5 年、Laravel で EC 保守を担当しています");
    expect(rowB.personal_answer_template).toBeNull();
    expect(rowB.answer_template).toBe("共通B: 具体例があります");
  });

  it("exposes draft_answer_template separately when regeneration conflicts with manual edits", async () => {
    state.personalTemplates.set("ses:seed-learner:101", {
      id: "tpl-101",
      tenantId: "ses",
      profileId: SEED_PROFILES.learner.id,
      questionNo: 101,
      content: "手直し済みの型",
      draftContent: "新しい生成案",
      generatedFrom: "sheet-2",
      source: "manual",
      updatedBy: SEED_PROFILES.learner.id,
    });

    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");
    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, { method: "GET", token });

    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find((r: { no: number }) => r.no === 101);
    expect(row.personal_answer_template).toBe("手直し済みの型");
    expect(row.draft_answer_template).toBe("新しい生成案");
    expect(row.has_pending_draft).toBe(true);
  });

  const staffViewRoles = [
    ["instructor", "seed-instructor"],
    ["sales", "seed-sales"],
    ["admin", "seed-admin"],
    ["platform_admin", "seed-platform-admin"],
  ] as const;

  it.each(staffViewRoles)(
    "allows %s to GET a learner personal answer template via profileId query",
    async (_role, userId) => {
      state.personalTemplates.set("ses:seed-learner:101", {
        id: "tpl-101",
        tenantId: "ses",
        profileId: SEED_PROFILES.learner.id,
        questionNo: 101,
        content: "スタッフ閲覧用の個別型",
        draftContent: null,
        generatedFrom: "sheet-1",
        source: "ai",
        updatedBy: "system",
      });

      const { app } = createTestApp(env);
      const token = await mintInterviewPrepTestToken(userId);
      const res = await request(
        app,
        env,
        `${INTERVIEW_PREP_QUESTIONS_PATH}?profileId=${encodeURIComponent(SEED_PROFILES.learner.id)}`,
        { method: "GET", token },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      const row = body.rows.find((r: { no: number }) => r.no === 101);
      expect(row.personal_answer_template).toBe("スタッフ閲覧用の個別型");
      expect(body.profileId).toBe(SEED_PROFILES.learner.id);
    },
  );
});

describe("PUT /api/interview-prep/answer-templates/:profileId/:no (#206)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(() => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  const editRoles = [
    ["student", "seed-learner", "seed-learner"],
    ["instructor", "seed-instructor", "seed-learner"],
    ["sales", "seed-sales", "seed-learner"],
    ["admin", "seed-admin", "seed-learner"],
    ["platform_admin", "seed-platform-admin", "seed-learner"],
  ] as const;

  it.each(editRoles)(
    "allows %s to edit personal answer template and records updated_by",
    async (_role, userId, targetId) => {
      const { app } = createTestApp(env);
      const token = await mintInterviewPrepTestToken(userId);

      const res = await request(
        app,
        env,
        interviewPrepAnswerTemplatePath(targetId, TEST_INTERVIEW_QUESTIONS[0].no),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "編集後の個別の型" }),
          token,
        },
      );

      expect(res.status).toBe(200);
      const stored = state.personalTemplates.get(`ses:${targetId}:101`);
      expect(stored?.content).toBe("編集後の個別の型");
      expect(stored?.source).toBe("manual");
      expect(stored?.updatedBy).toBe(userId);
    },
  );
});

describe("POST /api/interview-prep/answer-templates/:profileId/:no/adopt-draft (#206)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(() => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;

    state.personalTemplates.set("ses:seed-learner:101", {
      id: "tpl-101",
      tenantId: "ses",
      profileId: SEED_PROFILES.learner.id,
      questionNo: 101,
      content: "手直し済みの型",
      draftContent: "新しい生成案",
      generatedFrom: "sheet-2",
      source: "manual",
      updatedBy: SEED_PROFILES.learner.id,
    });
  });

  it("adopts draft into personal_answer_template and clears draft_content", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(
      app,
      env,
      interviewPrepAdoptDraftPath(SEED_PROFILES.learner.id, 101),
      {
        method: "POST",
        token,
      },
    );

    expect(res.status).toBe(200);
    const stored = state.personalTemplates.get("ses:seed-learner:101");
    expect(stored?.content).toBe("新しい生成案");
    expect(stored?.draftContent).toBeNull();
  });
});

describe("my-answer-memo retirement (#206)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(() => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  it("does not serve my-answers API as the primary answer store", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, `${INTERVIEW_PREP_MY_ANSWERS_PATH}/101`, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(404);
  });

  it("rejects progress updates that try to persist myAnswer memos", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, interviewPrepProgressPath(101), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ myAnswer: "メモを残したい" }),
      token,
    });

    expect([404, 410]).toContain(res.status);
  });

  it("does not include my_answer in learner questions payload", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    for (const row of body.rows) {
      expect(row).not.toHaveProperty("my_answer");
    }
  });
});
