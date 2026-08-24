/**
 * Issue #205 — interview scheduled date (sales/admin register + display) TDD tests.
 *
 * Exercises PUT/GET assignment routes and learner questions payload.
 * Expected route module: ./interview-prep.js
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION } from "@falcon/shared/interview/fix-notes";

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
  interviewPrepFixNotePath,
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
      // where 句を解釈しないモック DB のため、 質問単位 / 行単位のクエリは
      // ルートパラメータを条件として渡す (改善点メモの追加・消し込み)。
      const noParam = Number.parseInt(c.req.param("no") ?? "", 10);
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
          questionNo: Number.isInteger(noParam) ? noParam : undefined,
          rowId: c.req.param("id") || undefined,
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

    // 準備ホーム導入で PUT /progress/:no は学習ステータス (event enum) 専用として
    // 存在するようになった。 myAnswer を含む body は 400 で拒否され、 保存もされない。
    expect([400, 404, 410]).toContain(res.status);
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

describe("改善点メモ (#234)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(async () => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;

    // 学習者に PHP を割り当てる (No.101 が可視、 No.103 は割当範囲外)。
    const { app } = createTestApp(env);
    const salesToken = await mintInterviewPrepTestToken("seed-sales");
    await putAssignment(
      app,
      env,
      salesToken,
      SEED_PROFILES.learner.id,
      putAssignmentBody({ categories: ["PHP"] }),
    );
  });

  const addNote = async (token: string, questionNo: number, text: unknown) => {
    const { app } = createTestApp(env);
    return request(app, env, interviewPrepFixNotePath(questionNo), {
      method: "POST",
      body: JSON.stringify({ text }),
      token,
    });
  };

  it("受講者はメモを追加でき、 質問一覧に未解決として同梱される", async () => {
    const token = await mintInterviewPrepTestToken("seed-learner");

    const created = await addNote(token, 101, "  結論から  先に ");
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.note).toMatchObject({
      question_no: 101,
      text: "結論から 先に",
      resolved_at: null,
    });
    expect(typeof createdBody.note.id).toBe("string");

    const { app } = createTestApp(env);
    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, { method: "GET", token });
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find((r: { no: number }) => r.no === 101);
    expect(row.fix_notes).toHaveLength(1);
    expect(row.fix_notes[0]).toMatchObject({ text: "結論から 先に", resolved_at: null });
    const other = body.rows.find((r: { no: number }) => r.no === 104);
    expect(other.fix_notes).toEqual([]);
  });

  it("メモを消し込むと resolved_at が入り、 取り消しで戻せる", async () => {
    const token = await mintInterviewPrepTestToken("seed-learner");
    const created = await addNote(token, 101, "数字を即答できるように");
    const { note } = await created.json();

    const { app } = createTestApp(env);
    const resolved = await request(app, env, interviewPrepFixNotePath(note.id), {
      method: "PUT",
      body: JSON.stringify({ resolved: true }),
      token,
    });
    expect(resolved.status).toBe(200);
    expect((await resolved.json()).note.resolved_at).not.toBeNull();

    const reopened = await request(app, env, interviewPrepFixNotePath(note.id), {
      method: "PUT",
      body: JSON.stringify({ resolved: false }),
      token,
    });
    expect(reopened.status).toBe(200);
    expect((await reopened.json()).note.resolved_at).toBeNull();
  });

  it("空文字のメモは 400 で保存しない", async () => {
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await addNote(token, 101, "   ");

    expect(res.status).toBe(400);
    expect(state.fixNotes).toHaveLength(0);
  });

  it("割当範囲外の質問には付けられない", async () => {
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await addNote(token, 103, "JS の質問へのメモ");

    expect(res.status).toBe(403);
    expect(state.fixNotes).toHaveLength(0);
  });

  it("受講者以外は追加できない", async () => {
    const token = await mintInterviewPrepTestToken("seed-instructor");

    const res = await addNote(token, 101, "講師のメモ");

    expect(res.status).toBe(403);
    expect(state.fixNotes).toHaveLength(0);
  });

  it("他人のメモは消し込めない", async () => {
    const ownerToken = await mintInterviewPrepTestToken("seed-learner");
    const created = await addNote(ownerToken, 101, "本人のメモ");
    const { note } = await created.json();

    const { app } = createTestApp(env);
    const otherToken = await mintInterviewPrepTestToken("seed-learner-b");
    const res = await request(app, env, interviewPrepFixNotePath(note.id), {
      method: "PUT",
      body: JSON.stringify({ resolved: true }),
      token: otherToken,
    });

    expect(res.status).toBe(404);
    expect(state.fixNotes[0]?.resolvedAt).toBeNull();
  });

  it("消し込みの取り消しも未解決の上限を超えない", async () => {
    const token = await mintInterviewPrepTestToken("seed-learner");
    const { app } = createTestApp(env);

    // 上限ちょうどまで溜める → 1 件消し込む → 空いた枠を新しいメモで埋める。
    const created: string[] = [];
    for (let i = 0; i < FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION; i++) {
      const res = await addNote(token, 101, `メモ ${i}`);
      expect(res.status).toBe(201);
      created.push((await res.json()).note.id);
    }
    const first = created[0] as string;
    const resolved = await request(app, env, interviewPrepFixNotePath(first), {
      method: "PUT",
      body: JSON.stringify({ resolved: true }),
      token,
    });
    expect(resolved.status).toBe(200);
    expect((await addNote(token, 101, "入れ替えのメモ")).status).toBe(201);

    // ここで消し込みを取り消すと未解決が上限を 1 件超えるので拒否される。
    const reopened = await request(app, env, interviewPrepFixNotePath(first), {
      method: "PUT",
      body: JSON.stringify({ resolved: false }),
      token,
    });

    expect(reopened.status).toBe(400);
    expect(state.fixNotes.find((n) => n.id === first)?.resolvedAt).not.toBeNull();
  });

  it("上限に余裕があれば消し込みを取り消せる", async () => {
    const token = await mintInterviewPrepTestToken("seed-learner");
    const { app } = createTestApp(env);
    const created = await addNote(token, 101, "戻せるメモ");
    const { note } = await created.json();

    await request(app, env, interviewPrepFixNotePath(note.id), {
      method: "PUT",
      body: JSON.stringify({ resolved: true }),
      token,
    });
    const reopened = await request(app, env, interviewPrepFixNotePath(note.id), {
      method: "PUT",
      body: JSON.stringify({ resolved: false }),
      token,
    });

    expect(reopened.status).toBe(200);
    expect((await reopened.json()).note.resolved_at).toBeNull();
  });

  it("resolved が真偽値でなければ 400", async () => {
    const token = await mintInterviewPrepTestToken("seed-learner");
    const created = await addNote(token, 101, "メモ");
    const { note } = await created.json();

    const { app } = createTestApp(env);
    const res = await request(app, env, interviewPrepFixNotePath(note.id), {
      method: "PUT",
      body: JSON.stringify({ resolved: "yes" }),
      token,
    });

    expect(res.status).toBe(400);
  });
});

describe("深掘り音声 (#234)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(() => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  it("audio の part が不正なら 400", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/104/audio?part=deep9`, {
      method: "GET",
      token,
    });

    expect(res.status).toBe(400);
  });

  it("生成は質問文と深掘りを合わせて 10 件までに制限する", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, "/api/interview-prep/audio/generate", {
      method: "POST",
      body: JSON.stringify({
        nos: [101, 102, 103, 104, 105, 106],
        segments: [
          { no: 101, part: "deep1" },
          { no: 101, part: "deep2" },
          { no: 102, part: "deep1" },
          { no: 102, part: "deep2" },
          { no: 103, part: "deep1" },
        ],
      }),
      token,
    });

    expect(res.status).toBe(400);
  });

  it("segments の指定が不正なら 400", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, "/api/interview-prep/audio/generate", {
      method: "POST",
      body: JSON.stringify({ segments: [{ no: 101, part: "answer" }] }),
      token,
    });

    expect(res.status).toBe(400);
  });
});
