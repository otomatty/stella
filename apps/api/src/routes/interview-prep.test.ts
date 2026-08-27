/**
 * Issue #205 — interview scheduled date (sales/admin register + display) TDD tests.
 *
 * Exercises PUT/GET assignment routes and learner questions payload.
 * Expected route module: ./interview-prep.js
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION } from "@falcon/shared/interview/fix-notes";
import { interviewAudioTextHash } from "@falcon/shared/interview/audio";

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
  progressRow,
  putAssignmentBody,
  type InterviewPrepTestState,
  type ProgressRow,
} from "./interview-prep.test-helpers.js";

vi.mock("../lib/audit.js", () => ({
  clientIp: () => "127.0.0.1",
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

/**
 * 読み上げ (TTS) は差し替える。 質問編集 (#237) は保存の延長で音声を作り直すので、
 * 「設定済みか」と「合成が成功するか」をテストごとに切り替えられるようにする。
 */
const tts = {
  configured: true,
  synthesize: vi.fn(async () => new Uint8Array([1, 2, 3])),
};

vi.mock("../lib/workers-ai.js", () => ({
  // ロックの TTL がこの値から決まるので、 モックでも実体と同じ形で返す。
  AI_REQUEST_TIMEOUT_MS: 25_000,
  workersAiConfigured: () => tts.configured,
  synthesizeSpeech: (...args: unknown[]) => tts.synthesize(...(args as [])),
  transcribeAudio: vi.fn(),
}));

/** テナント別の音声キー (`interview-tts/<tenant>/<no>.mp3`)。 */
const ttsKey = (no: number, part = "question") =>
  `interview-tts/ses/${part === "question" ? `${no}.mp3` : `${no}-${part}.mp3`}`;

/** テナント別キーになる前の共通キー (旧レイアウト)。 */
const legacyTtsKey = (no: number, part = "question") =>
  `interview-tts/${part === "question" ? `${no}.mp3` : `${no}-${part}.mp3`}`;

/** R2 の代わり。 put / delete / list を素朴に覚えるだけ。 */
function createFakeBucket() {
  const objects = new Map<string, { customMetadata?: Record<string, string> }>();
  return {
    objects,
    put: vi.fn(
      async (key: string, _body: unknown, opts?: { customMetadata?: Record<string, string> }) => {
        objects.set(key, { customMetadata: opts?.customMetadata });
      },
    ),
    delete: vi.fn(async (key: string) => {
      objects.delete(key);
    }),
    head: vi.fn(async (key: string) => {
      const found = objects.get(key);
      return found ? { key, customMetadata: found.customMetadata } : null;
    }),
    get: vi.fn(async (key: string) => {
      const found = objects.get(key);
      if (!found) return null;
      return {
        key,
        body: null,
        size: 3,
        httpEtag: '"etag"',
        customMetadata: found.customMetadata,
      };
    }),
    // prefix / delimiter は本番と同じ意味で効かせる (テナント配下へ降りない列挙を試す)。
    list: vi.fn(async (opts?: { prefix?: string; delimiter?: string }) => {
      const prefix = opts?.prefix ?? "";
      const delimiter = opts?.delimiter;
      const matched = [...objects.entries()].filter(([key]) => {
        if (!key.startsWith(prefix)) return false;
        if (!delimiter) return true;
        return !key.slice(prefix.length).includes(delimiter);
      });
      return {
        objects: matched.map(([key, v]) => ({ key, customMetadata: v.customMetadata })),
        truncated: false as const,
      };
    }),
  };
}

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

  it("面談対策の対象でないロール (講師) は追加できない", async () => {
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

describe("音声生成のモデル指定", () => {
  let env: Env;
  let state: InterviewPrepTestState;
  let bucket: ReturnType<typeof createFakeBucket>;

  beforeEach(() => {
    bucket = createFakeBucket();
    env = createInterviewPrepTestEnv({ MATERIALS_BUCKET: bucket as unknown as R2Bucket });
    state = createInterviewPrepTestState();
    state.questions = [
      { ...TEST_INTERVIEW_QUESTIONS[0], no: 101 },
    ] as typeof TEST_INTERVIEW_QUESTIONS;
    tts.configured = true;
    tts.synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  it("未知の model は 400", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, "/api/interview-prep/audio/generate", {
      method: "POST",
      body: JSON.stringify({ nos: [101], model: "@cf/myshell-ai/melotts" }),
      token,
    });

    expect(res.status).toBe(400);
    expect(tts.synthesize).not.toHaveBeenCalled();
  });

  it("許可した model を読み上げに渡す", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, "/api/interview-prep/audio/generate", {
      method: "POST",
      body: JSON.stringify({ nos: [101], model: "openai/tts-1" }),
      token,
    });

    expect(res.status).toBe(200);
    expect(tts.synthesize).toHaveBeenCalled();
    const args = tts.synthesize.mock.calls[0] as unknown[];
    expect(args[4]).toBe("openai/tts-1");
  });

  it("model 未指定なら読み上げの上書きは渡さない", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, "/api/interview-prep/audio/generate", {
      method: "POST",
      body: JSON.stringify({ nos: [101] }),
      token,
    });

    expect(res.status).toBe(200);
    const args = tts.synthesize.mock.calls[0] as unknown[];
    expect(args[4]).toBeUndefined();
  });
});

describe("GET /api/interview-prep/assignments monitoring aggregates (#236)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  /** 受講者ごとに割当 + 進捗 + 個別の型を用意する (割当は sales で保存する)。 */
  async function seedLearner(
    profileId: string,
    opts: {
      categories?: string[];
      interviewDate?: string | null;
      progress?: Array<Partial<ProgressRow> & { questionNo: number }>;
      drafted?: number[];
    },
  ) {
    const { app } = createTestApp(env);
    const salesToken = await mintInterviewPrepTestToken("seed-sales");
    await putAssignment(
      app,
      env,
      salesToken,
      profileId,
      putAssignmentBody({
        categories: opts.categories ?? ["PHP"],
        interviewDate: opts.interviewDate ?? null,
      }),
    );
    for (const p of opts.progress ?? []) {
      state.progress.push(progressRow({ ...p, profileId }));
    }
    for (const no of opts.drafted ?? []) {
      state.personalTemplates.set(`ses:${profileId}:${no}`, {
        id: `tpl-${profileId}-${no}`,
        tenantId: "ses",
        profileId,
        questionNo: no,
        content: "個別の型",
        draftContent: null,
        generatedFrom: null,
        source: "ai",
        updatedBy: null,
      });
    }
  }

  async function fetchRows(tokenUser: string) {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken(tokenUser);
    const res = await request(app, env, INTERVIEW_PREP_ASSIGNMENTS_PATH, { method: "GET", token });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      rows: Array<Record<string, unknown> & { profile_id: string }>;
    };
    return body.rows;
  }

  beforeEach(() => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  it("割当範囲の A 必修だけを分母に準備率と内訳を返す", async () => {
    // PHP 割当の可視質問は 101(A) / 102(B) / 104(共通 A) → A 必修は 101 と 104 の 2 問。
    await seedLearner(SEED_PROFILES.learner.id, {
      categories: ["PHP"],
      progress: [{ questionNo: 101, status: "confident" }],
      drafted: [104],
    });

    const rows = await fetchRows("seed-instructor");
    const row = rows.find((r) => r.profile_id === SEED_PROFILES.learner.id);

    expect(row).toMatchObject({
      prepRate: 50,
      prepTotal: 2,
      breakdown: { confident: 1, drafted: 1, read: 0, none: 0 },
    });
  });

  it("最終練習日は interview_progress の最大値", async () => {
    await seedLearner(SEED_PROFILES.learner.id, {
      progress: [
        { questionNo: 101, status: "confident", lastPracticedAt: new Date("2026-09-03T04:00:00Z") },
        { questionNo: 102, status: "read", lastPracticedAt: new Date("2026-09-07T04:00:00Z") },
        { questionNo: 104, status: "read", lastPracticedAt: null },
      ],
    });

    const rows = await fetchRows("seed-sales");
    const row = rows.find((r) => r.profile_id === SEED_PROFILES.learner.id);

    expect(row?.lastPracticedAt).toBe("2026-09-07T04:00:00.000Z");
  });

  it("進捗も個別の型も無い受講者は準備率 0 / 最終練習日 null", async () => {
    await seedLearner(SEED_PROFILES.learner.id, { categories: ["PHP"] });

    const rows = await fetchRows("seed-admin");
    const row = rows.find((r) => r.profile_id === SEED_PROFILES.learner.id);

    expect(row).toMatchObject({ prepRate: 0, prepTotal: 2, lastPracticedAt: null });
    expect(row?.breakdown).toEqual({ confident: 0, drafted: 0, read: 0, none: 2 });
  });

  it("割当が無い受講者は分母 0 でも 0% (ゼロ除算しない)", async () => {
    // 割当を保存していない受講者も一覧には並ぶ。 可視は共通 A の 104 のみ。
    const rows = await fetchRows("seed-instructor");
    const row = rows.find((r) => r.profile_id === SEED_PROFILES.learnerD.id);

    expect(row).toMatchObject({ prepRate: 0, prepTotal: 1, lastPracticedAt: null });
  });

  it("受講者ごとの進捗が混ざらない", async () => {
    await seedLearner(SEED_PROFILES.learner.id, {
      progress: [
        { questionNo: 101, status: "confident" },
        { questionNo: 104, status: "confident" },
      ],
    });
    await seedLearner(SEED_PROFILES.learnerB.id, {
      progress: [{ questionNo: 101, status: "confident" }],
    });

    const rows = await fetchRows("seed-instructor");

    expect(rows.find((r) => r.profile_id === SEED_PROFILES.learner.id)?.prepRate).toBe(100);
    expect(rows.find((r) => r.profile_id === SEED_PROFILES.learnerB.id)?.prepRate).toBe(50);
    expect(rows.find((r) => r.profile_id === SEED_PROFILES.learnerC.id)?.prepRate).toBe(0);
  });

  it("受講者数によらず集計クエリは 1 テーブル 1 回 (N+1 を作らない)", async () => {
    await seedLearner(SEED_PROFILES.learner.id, {
      progress: [{ questionNo: 101, status: "confident" }],
    });
    await seedLearner(SEED_PROFILES.learnerB.id, { drafted: [104] });
    await seedLearner(SEED_PROFILES.learnerC.id, {});
    state.selectCounts = {};

    const rows = await fetchRows("seed-instructor");

    // 受講者 4 名 + 面談対策の対象になる管理者 1 名 (講師・営業は対象外)。
    expect(rows.length).toBe(5);
    expect(state.selectCounts.interview_progress).toBe(1);
    expect(state.selectCounts.interview_personal_templates).toBe(1);
    expect(state.selectCounts.interview_questions).toBe(1);
  });

  it("受講者は一覧を取得できない (#202 の権限境界)", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, INTERVIEW_PREP_ASSIGNMENTS_PATH, { method: "GET", token });

    expect(res.status).toBe(403);
  });
});

describe("面談対策の対象者 (受講者 + 管理者)", () => {
  let env: Env;
  let state: InterviewPrepTestState;

  beforeEach(() => {
    env = createInterviewPrepTestEnv();
    state = createInterviewPrepTestState();
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  it("管理者を割当対象にできる (受講者と同じ面談対策を受ける)", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.admin.id,
      putAssignmentBody({ categories: ["PHP"], interviewDate: "2026-09-10" }),
    );

    expect(res.status).toBe(200);
    expect(state.assignments.get(`ses:${SEED_PROFILES.admin.id}`)).toMatchObject({
      categories: ["PHP"],
      interviewDate: "2026-09-10",
    });
  });

  it("対象者一覧に管理者が並び、 行のロールが分かる", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");
    await putAssignment(app, env, token, SEED_PROFILES.admin.id, putAssignmentBody());

    const res = await request(app, env, INTERVIEW_PREP_ASSIGNMENTS_PATH, { method: "GET", token });

    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.rows.find(
      (r: { profile_id: string }) => r.profile_id === SEED_PROFILES.admin.id,
    );
    expect(row).toMatchObject({ role: "admin", categories: ["PHP"] });
    const learner = body.rows.find(
      (r: { profile_id: string }) => r.profile_id === SEED_PROFILES.learner.id,
    );
    expect(learner?.role).toBe("student");
  });

  it("講師・営業は対象にならない (一覧にも載らず、 割当も 400)", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.instructor.id,
      putAssignmentBody(),
    );
    expect(res.status).toBe(400);
    expect(state.assignments.size).toBe(0);

    const list = await request(app, env, INTERVIEW_PREP_ASSIGNMENTS_PATH, { method: "GET", token });
    const body = await list.json();
    const ids = body.rows.map((r: { profile_id: string }) => r.profile_id);
    expect(ids).not.toContain(SEED_PROFILES.instructor.id);
    expect(ids).not.toContain(SEED_PROFILES.sales.id);
  });

  it("管理者は自分の学習ステータスを記録できる", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");
    await putAssignment(app, env, token, SEED_PROFILES.admin.id, putAssignmentBody());

    const res = await request(app, env, interviewPrepProgressPath(101), {
      method: "PUT",
      body: JSON.stringify({ event: "confident" }),
      token,
    });

    expect(res.status).toBe(200);
    expect(
      state.progress.find((r) => r.profileId === SEED_PROFILES.admin.id && r.questionNo === 101),
    ).toMatchObject({ status: "confident" });
  });

  it("講師・営業は学習ステータスを記録できない (面談対策の対象ではない)", async () => {
    const { app } = createTestApp(env);
    for (const who of ["seed-instructor", "seed-sales"]) {
      const token = await mintInterviewPrepTestToken(who);
      const res = await request(app, env, interviewPrepProgressPath(101), {
        method: "PUT",
        body: JSON.stringify({ event: "confident" }),
        token,
      });
      expect(res.status).toBe(403);
    }
    expect(state.progress).toHaveLength(0);
  });

  it("管理者も割当範囲外の質問には練習を記録できない (受講者と同じ可視性)", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");
    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.admin.id,
      putAssignmentBody({ categories: ["PHP"] }),
    );

    // 103 は JS。 質問全件を読める管理者でも、 練習の記録は自分の割当で閉じる。
    const progress = await request(app, env, interviewPrepProgressPath(103), {
      method: "PUT",
      body: JSON.stringify({ event: "confident" }),
      token,
    });
    expect(progress.status).toBe(403);

    const note = await request(app, env, interviewPrepFixNotePath(103), {
      method: "POST",
      body: JSON.stringify({ text: "割当範囲外へのメモ" }),
      token,
    });
    expect(note.status).toBe(403);

    expect(state.progress).toHaveLength(0);
    expect(state.fixNotes).toHaveLength(0);
  });

  it("割当範囲内なら管理者も記録できる (共通カテゴリを含む)", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");
    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.admin.id,
      putAssignmentBody({ categories: ["PHP"] }),
    );

    for (const no of [101, 104]) {
      const res = await request(app, env, interviewPrepProgressPath(no), {
        method: "PUT",
        body: JSON.stringify({ event: "read" }),
        token,
      });
      expect(res.status).toBe(200);
    }
  });

  it("管理者が自分の profileId を指定すると、 受講者と同じ (割当ぶんの) 質問が返る", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");
    await putAssignment(
      app,
      env,
      token,
      SEED_PROFILES.admin.id,
      putAssignmentBody({ categories: ["PHP"] }),
    );

    const res = await request(
      app,
      env,
      `${INTERVIEW_PREP_QUESTIONS_PATH}?profileId=${SEED_PROFILES.admin.id}`,
      { method: "GET", token },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignedCategories).toEqual(["PHP"]);
    // PHP (101/102) + 全案件共通 (104)。 割当外の JS (103) は含めない。
    expect(body.rows.map((r: { no: number }) => r.no).sort()).toEqual([101, 102, 104]);
  });
});

describe("想定質問の編集 (#237)", () => {
  let env: Env;
  let state: InterviewPrepTestState;
  let bucket: ReturnType<typeof createFakeBucket>;

  const questionPath = (no: number) => `${INTERVIEW_PREP_QUESTIONS_PATH}/${no}`;

  beforeEach(() => {
    bucket = createFakeBucket();
    env = createInterviewPrepTestEnv({ MATERIALS_BUCKET: bucket as unknown as R2Bucket });
    state = createInterviewPrepTestState();
    // 深掘りを持つ質問を 1 問用意する (音声セグメントが 2 つになる)。
    state.questions = [
      {
        ...TEST_INTERVIEW_QUESTIONS[0],
        no: 101,
        deep1: "直近の案件は？ → 規模と役割を先に言う",
      },
      { ...TEST_INTERVIEW_QUESTIONS[1] },
    ] as typeof TEST_INTERVIEW_QUESTIONS;
    tts.configured = true;
    tts.synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  const patch = async (token: string, no: number, body: Record<string, unknown>) => {
    const { app } = createTestApp(env);
    return request(app, env, questionPath(no), {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    });
  };

  it("admin は質問文を保存でき、 読み上げ音声も作り直される", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await patch(token, 101, { question: "自己紹介をお願いします" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      row: { question: string };
      audio: { regenerated: string[]; stale: string[] };
    };
    expect(body.row.question).toBe("自己紹介をお願いします");
    expect(body.audio.regenerated).toEqual(["101:question"]);
    expect(body.audio.stale).toEqual([]);
    expect(tts.synthesize).toHaveBeenCalledTimes(1);
    expect(bucket.objects.has(ttsKey(101))).toBe(true);
  });

  it("営業も編集できる (面談で実際に聞かれた言い回しを直せる)", async () => {
    const token = await mintInterviewPrepTestToken("seed-sales");

    const res = await patch(token, 101, { question: "営業が直した質問" });

    expect(res.status).toBe(200);
    expect(state.questions?.find((q) => q.no === 101)?.question).toBe("営業が直した質問");
  });

  it("講師と受講者は編集できない", async () => {
    for (const who of ["seed-instructor", "seed-learner"]) {
      const token = await mintInterviewPrepTestToken(who);
      const res = await patch(token, 101, { question: "許されない編集" });
      expect(res.status).toBe(403);
    }
    expect(state.questions?.find((q) => q.no === 101)?.question).not.toBe("許されない編集");
  });

  it("生成した音声には読み上げた本文の指紋が載る (あとで古さを判定するため)", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    await patch(token, 101, { question: "指紋つきの質問" });

    expect(bucket.objects.get(ttsKey(101))?.customMetadata).toEqual({
      textHash: interviewAudioTextHash("指紋つきの質問"),
    });
  });

  it("深掘りを直すとその深掘りの音声だけ作り直す", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await patch(token, 101, { deep1: "直近の案件を教えてください → メモ" });

    const body = (await res.json()) as { audio: { regenerated: string[] } };
    expect(body.audio.regenerated).toEqual(["101:deep1"]);
    expect(bucket.objects.has(ttsKey(101, "deep1"))).toBe(true);
    expect(bucket.objects.has(ttsKey(101))).toBe(false);
  });

  it("読み上げない項目 (質問意図) を直しても音声は呼ばない", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await patch(token, 101, { intent: "意図を書き直した" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { audio: { regenerated: string[] } };
    expect(body.audio.regenerated).toEqual([]);
    expect(tts.synthesize).not.toHaveBeenCalled();
  });

  it("深掘りを空にすると、 その音声は消える", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    await patch(token, 101, { deep1: "直近の案件を教えてください → メモ" });
    expect(bucket.objects.has(ttsKey(101, "deep1"))).toBe(true);

    const res = await patch(token, 101, { deep1: "" });

    const body = (await res.json()) as { audio: { removed: string[] } };
    expect(body.audio.removed).toEqual(["101:deep1"]);
    expect(bucket.objects.has(ttsKey(101, "deep1"))).toBe(false);
  });

  it("読み上げが未設定でも編集は保存し、 古いセグメントを返す", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    // 先に音声を作っておく (指紋つき)。 古いと判定できる状態にしてから止める。
    await patch(token, 101, { question: "先に作った文面" });
    tts.configured = false;

    const res = await patch(token, 101, { question: "読み上げ未設定でも保存される" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { audio: { stale: string[]; reason: string | null } };
    expect(state.questions?.find((q) => q.no === 101)?.question).toBe(
      "読み上げ未設定でも保存される",
    );
    expect(body.audio.stale).toEqual(["101:question"]);
    expect(body.audio.reason).toMatch(/未設定/);
  });

  it("TTS が落ちても編集は残り、 そのセグメントが古いと分かる", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    await patch(token, 101, { question: "先に作った文面" });
    tts.synthesize = vi.fn(async () => {
      throw new Error("gateway 502");
    });

    const res = await patch(token, 101, { question: "音声だけ失敗する質問" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { audio: { stale: string[]; reason: string | null } };
    expect(state.questions?.find((q) => q.no === 101)?.question).toBe("音声だけ失敗する質問");
    expect(body.audio.stale).toEqual(["101:question"]);
    expect(body.audio.reason).toMatch(/gateway 502/);
  });

  it("空の質問文・選べない案件種別・未知の項目は 400", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    expect((await patch(token, 101, { question: "  " })).status).toBe(400);
    expect((await patch(token, 101, { categories: ["Rust"] })).status).toBe(400);
    expect((await patch(token, 101, { no: 999 })).status).toBe(400);
    expect((await patch(token, 101, {})).status).toBe(400);
  });

  it("存在しない質問番号は 404", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    expect((await patch(token, 999, { question: "無い質問" })).status).toBe(404);
  });

  it("編集した質問には編集の印が付き、 staff 一覧に出る (seed の上書きから守るため)", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    await patch(token, 101, { question: "印の付く質問" });

    const { app } = createTestApp(env);
    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, { method: "GET", token });

    const body = (await res.json()) as {
      rows: Array<{ no: number; edited_at: string | null; edited_by: string | null }>;
    };
    const edited = body.rows.find((r) => r.no === 101);
    expect(edited?.edited_at).toEqual(expect.any(String));
    expect(edited?.edited_by).toBe("seed-admin");
    expect(body.rows.find((r) => r.no === 102)?.edited_at).toBeNull();
  });

  it("正本へ戻すのは予約で、 編集の印はその場では外さない", async () => {
    const token = await mintInterviewPrepTestToken("seed-sales");
    await patch(token, 101, { question: "あとで正本に戻す質問" });
    expect(state.questionEdits.has(101)).toBe(true);

    const { app } = createTestApp(env);
    const res = await request(app, env, `${questionPath(101)}/edit-mark`, {
      method: "DELETE",
      token,
    });

    expect(res.status).toBe(200);
    expect((await res.json()) as { release_requested_at: string }).toEqual({
      ok: true,
      release_requested_at: expect.any(String),
    });
    // 本文はまだ編集後のまま。 印を外すのは、 seed が本文を書き戻すとき。
    expect(state.questionEdits.get(101)?.editedAt).toBeInstanceOf(Date);
    expect(state.questionEdits.get(101)?.releaseRequestedAt).toBeInstanceOf(Date);
  });

  it("予約したあとに保存し直すと、 予約は取り消される", async () => {
    const token = await mintInterviewPrepTestToken("seed-sales");
    await patch(token, 101, { question: "いったん戻す予定にする" });
    const { app } = createTestApp(env);
    await request(app, env, `${questionPath(101)}/edit-mark`, { method: "DELETE", token });
    expect(state.questionEdits.get(101)?.releaseRequestedAt).toBeInstanceOf(Date);

    await patch(token, 101, { question: "やっぱり直す" });

    expect(state.questionEdits.get(101)?.releaseRequestedAt).toBeNull();
  });

  it("編集の印は講師には外させない", async () => {
    const token = await mintInterviewPrepTestToken("seed-instructor");
    const { app } = createTestApp(env);

    const res = await request(app, env, `${questionPath(101)}/edit-mark`, {
      method: "DELETE",
      token,
    });

    expect(res.status).toBe(403);
  });

  it("本文と食い違う音声は一覧で古いと報告される", async () => {
    const admin = await mintInterviewPrepTestToken("seed-admin");
    await patch(admin, 101, { question: "最初の文面" });
    // 読み上げを止めたうえで直すと、 R2 の指紋は古い文面のまま残る。
    tts.configured = false;
    await patch(admin, 101, { question: "あとから直した文面" });

    const { app } = createTestApp(env);
    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: admin,
    });

    const body = (await res.json()) as { audioSegments: string[]; audioStaleSegments: string[] };
    expect(body.audioSegments).toContain("101:question");
    expect(body.audioStaleSegments).toEqual(["101:question"]);
  });

  it("指紋を持たない既存の音声は古い扱いにしない", async () => {
    bucket.objects.set(legacyTtsKey(101), {});
    const token = await mintInterviewPrepTestToken("seed-admin");

    const { app } = createTestApp(env);
    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, { method: "GET", token });

    const body = (await res.json()) as { audioStaleSegments: string[] };
    expect(body.audioStaleSegments).toEqual([]);
  });
});

/**
 * Codex レビュー (PR #246) が挙げた 2 件。 どちらも「本文と食い違う読み上げが
 * 受講者に届く」経路で、 この機能が防ごうとしているものそのもの。
 */
describe("古い音声を受講者に届けない (#237)", () => {
  let env: Env;
  let state: InterviewPrepTestState;
  let bucket: ReturnType<typeof createFakeBucket>;

  beforeEach(() => {
    bucket = createFakeBucket();
    env = createInterviewPrepTestEnv({ MATERIALS_BUCKET: bucket as unknown as R2Bucket });
    state = createInterviewPrepTestState();
    state.questions = [
      { ...TEST_INTERVIEW_QUESTIONS[0], no: 101 },
    ] as typeof TEST_INTERVIEW_QUESTIONS;
    // 受講者に 101 (PHP) が見えるようにする。
    state.assignments.set("ses:seed-learner", {
      tenantId: "ses",
      profileId: "seed-learner",
      categories: ["PHP"],
      interviewDate: null,
      interviewNote: null,
      assignedBy: "seed-admin",
    });
    tts.configured = true;
    tts.synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  /** 音声を作ったあと、 読み上げを止めてもう一度直す = 古い音声が R2 に残る状態。 */
  async function makeStaleAudio() {
    const { app } = createTestApp(env);
    const admin = await mintInterviewPrepTestToken("seed-admin");
    await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "最初の文面" }),
      token: admin,
    });
    tts.configured = false;
    await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "あとから直した文面" }),
      token: admin,
    });
  }

  it("受講者の一覧には古いセグメントを載せない (再生ボタンを出さない)", async () => {
    await makeStaleAudio();
    const { app } = createTestApp(env);
    const learner = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: learner,
    });

    const body = (await res.json()) as { audioNos: number[]; audioSegments: string[] };
    expect(body.audioSegments).not.toContain("101:question");
    expect(body.audioNos).not.toContain(101);
  });

  it("管理者が自分の練習ぶんを引くときは古いセグメントを載せない", async () => {
    await makeStaleAudio();
    state.assignments.set("ses:seed-admin", {
      tenantId: "ses",
      profileId: "seed-admin",
      categories: ["PHP"],
      interviewDate: null,
      interviewNote: null,
      assignedBy: "seed-admin",
    });
    const { app } = createTestApp(env);
    const admin = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}?profileId=seed-admin`, {
      method: "GET",
      token: admin,
    });

    const body = (await res.json()) as { audioNos: number[]; audioSegments: string[] };
    expect(body.audioSegments).not.toContain("101:question");
    expect(body.audioNos).not.toContain(101);
  });

  it("他人の行を覗くときは古いセグメントも残す (staff の試聴用)", async () => {
    await makeStaleAudio();
    const { app } = createTestApp(env);
    const admin = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}?profileId=seed-learner`, {
      method: "GET",
      token: admin,
    });

    const body = (await res.json()) as { audioSegments: string[] };
    expect(body.audioSegments).toContain("101:question");
  });

  it("staff の一覧には残す (試聴してから再生成する導線のため)", async () => {
    await makeStaleAudio();
    const { app } = createTestApp(env);
    const admin = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: admin,
    });

    const body = (await res.json()) as { audioSegments: string[]; audioStaleSegments: string[] };
    expect(body.audioSegments).toContain("101:question");
    expect(body.audioStaleSegments).toContain("101:question");
  });

  it("音声 URL を直接叩いても受講者には返さない (一覧から外すだけでは塞げない)", async () => {
    await makeStaleAudio();
    const { app } = createTestApp(env);
    const learner = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101/audio`, {
      method: "GET",
      token: learner,
    });

    expect(res.status).toBe(404);
    expect((await res.json()) as { error: string }).toEqual({
      error: "この質問の音声は本文の更新待ちです",
    });
  });

  it("本文と一致していれば受講者にも返す", async () => {
    const { app } = createTestApp(env);
    const admin = await mintInterviewPrepTestToken("seed-admin");
    await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "作り直せた文面" }),
      token: admin,
    });
    const learner = await mintInterviewPrepTestToken("seed-learner");

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101/audio`, {
      method: "GET",
      token: learner,
    });

    expect(res.status).toBe(200);
  });

  it("指紋の無い旧音声は、 作り直せなかったときに消す (古いと判定できないため)", async () => {
    // この仕組みより前に生成された音声 = customMetadata なし。
    bucket.objects.set(legacyTtsKey(101), {});
    tts.configured = false;
    const admin = await mintInterviewPrepTestToken("seed-admin");
    const { app } = createTestApp(env);

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "旧音声のまま残せない文面" }),
      token: admin,
    });

    const body = (await res.json()) as { audio: { removed: string[]; stale: string[] } };
    expect(body.audio.removed).toEqual(["101:question"]);
    expect(body.audio.stale).toEqual([]);
    expect(bucket.objects.has(ttsKey(101))).toBe(false);
  });

  it("指紋つきの音声は消さずに残す (古いと分かるので再生成できる)", async () => {
    const admin = await mintInterviewPrepTestToken("seed-admin");
    const { app } = createTestApp(env);
    await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "指紋つきで作った文面" }),
      token: admin,
    });
    tts.configured = false;

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "作り直せなかった文面" }),
      token: admin,
    });

    const body = (await res.json()) as { audio: { removed: string[]; stale: string[] } };
    expect(body.audio.stale).toEqual(["101:question"]);
    expect(body.audio.removed).toEqual([]);
    expect(bucket.objects.has(ttsKey(101))).toBe(true);
  });

  it("そもそも音声が無いセグメントは「古い」と報告しない (未登録であって古くはない)", async () => {
    tts.configured = false;
    const admin = await mintInterviewPrepTestToken("seed-admin");
    const { app } = createTestApp(env);

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "音声を一度も作っていない質問" }),
      token: admin,
    });

    const body = (await res.json()) as {
      audio: { stale: string[]; removed: string[]; reason: string | null };
    };
    expect(body.audio.stale).toEqual([]);
    expect(body.audio.removed).toEqual([]);
    expect(body.audio.reason).toBeNull();
  });

  it("TTS が落ちたときも、 指紋の無い旧音声は残さない", async () => {
    bucket.objects.set(legacyTtsKey(101), {});
    tts.synthesize = vi.fn(async () => {
      throw new Error("gateway 502");
    });
    const admin = await mintInterviewPrepTestToken("seed-admin");
    const { app } = createTestApp(env);

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "TTS が落ちた文面" }),
      token: admin,
    });

    const body = (await res.json()) as { audio: { removed: string[]; reason: string | null } };
    expect(body.audio.removed).toEqual(["101:question"]);
    expect(body.audio.reason).toMatch(/gateway 502/);
    expect(bucket.objects.has(ttsKey(101))).toBe(false);
  });
});

describe("質問編集の読み上げはレート制限に従う (#237)", () => {
  let state: InterviewPrepTestState;
  let bucket: ReturnType<typeof createFakeBucket>;

  /** 常に上限超過を返すリミッタ (wrangler の Rate Limiting バインディング相当)。 */
  const blockingLimiter = { limit: async () => ({ success: false }) } as unknown as RateLimit;

  beforeEach(() => {
    bucket = createFakeBucket();
    state = createInterviewPrepTestState();
    state.questions = [
      { ...TEST_INTERVIEW_QUESTIONS[0], no: 101 },
    ] as typeof TEST_INTERVIEW_QUESTIONS;
    tts.configured = true;
    tts.synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  const envWith = (limiter?: RateLimit): Env =>
    createInterviewPrepTestEnv({
      MATERIALS_BUCKET: bucket as unknown as R2Bucket,
      ...(limiter ? { AI_RATE_LIMITER: limiter } : {}),
    });

  it("上限に当たったら TTS を呼ばない (営業の保存ごとの課金を抑える)", async () => {
    const env = envWith(blockingLimiter);
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-sales");

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "上限に当たった保存" }),
      token,
    });

    expect(res.status).toBe(200);
    expect(tts.synthesize).not.toHaveBeenCalled();
    const body = (await res.json()) as { audio: { regenerated: string[] } };
    expect(body.audio.regenerated).toEqual([]);
    // 編集そのものは保存する (音声の都合で編集を落とさない)。
    expect(state.questions?.find((q) => q.no === 101)?.question).toBe("上限に当たった保存");
  });

  it("読み上げが走らない編集ではレート制限の枠を使わない", async () => {
    const limiter = { limit: vi.fn(async () => ({ success: true })) };
    const env = envWith(limiter as unknown as RateLimit);
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    // 質問意図は読み上げないので、 TTS もレート制限も呼ばない。
    await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ intent: "意図だけ直す" }),
      token,
    });

    expect(limiter.limit).not.toHaveBeenCalled();
    expect(tts.synthesize).not.toHaveBeenCalled();
  });

  it("読み上げが走る編集ではレート制限を通す", async () => {
    const limiter = { limit: vi.fn(async () => ({ success: true })) };
    const env = envWith(limiter as unknown as RateLimit);
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify({ question: "読み上げが走る編集" }),
      token,
    });

    expect(limiter.limit).toHaveBeenCalledTimes(1);
    expect(tts.synthesize).toHaveBeenCalledTimes(1);
  });
});

/**
 * PR #246 のレビュー指摘。 テナント別キーと、 合成中に別の保存が入る競合。
 */
describe("音声キーのテナント分離と競合 (#237)", () => {
  let env: Env;
  let state: InterviewPrepTestState;
  let bucket: ReturnType<typeof createFakeBucket>;

  beforeEach(() => {
    bucket = createFakeBucket();
    env = createInterviewPrepTestEnv({ MATERIALS_BUCKET: bucket as unknown as R2Bucket });
    state = createInterviewPrepTestState();
    state.questions = [
      { ...TEST_INTERVIEW_QUESTIONS[0], no: 101 },
    ] as typeof TEST_INTERVIEW_QUESTIONS;
    state.assignments.set("ses:seed-learner", {
      tenantId: "ses",
      profileId: "seed-learner",
      categories: ["PHP"],
      interviewDate: null,
      interviewNote: null,
      assignedBy: "seed-admin",
    });
    tts.configured = true;
    tts.synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
    (globalThis as { __interviewPrepTestState?: InterviewPrepTestState }).__interviewPrepTestState =
      state;
  });

  const patch = async (token: string, body: Record<string, unknown>) => {
    const { app } = createTestApp(env);
    return request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    });
  };

  it("生成した音声はテナント配下に置く (共通キーを踏まない)", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    await patch(token, { question: "テナント配下に置く質問" });

    expect(bucket.objects.has(ttsKey(101))).toBe(true);
    expect(bucket.objects.has(legacyTtsKey(101))).toBe(false);
  });

  it("他テナントと共有の旧音声は、 編集しても消さない", async () => {
    // 旧レイアウトの音声 = 他テナントがまだ正しく使っているかもしれない共有物。
    bucket.objects.set(legacyTtsKey(101), {});
    tts.configured = false;
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await patch(token, { question: "共有物は壊さない" });

    expect(res.status).toBe(200);
    expect(bucket.objects.has(legacyTtsKey(101))).toBe(true);
    // このテナントからはもう使えないので、 消えた扱いで報告する。
    const body = (await res.json()) as { audio: { removed: string[] } };
    expect(body.audio.removed).toEqual(["101:question"]);
  });

  it("まだ誰も直していない質問は、 旧共通キーの音声をそのまま使える", async () => {
    // 既存の登録済み音声をデプロイで捨てないための後方互換。
    bucket.objects.set(legacyTtsKey(101), {});
    const { app } = createTestApp(env);
    const learner = await mintInterviewPrepTestToken("seed-learner");

    const list = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: learner,
    });
    const body = (await list.json()) as { audioSegments: string[] };
    expect(body.audioSegments).toContain("101:question");

    const audio = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101/audio`, {
      method: "GET",
      token: learner,
    });
    expect(audio.status).toBe(200);
  });

  it("編集済みの質問では旧共通キーの音声を使わない (編集前の文面かもしれない)", async () => {
    bucket.objects.set(legacyTtsKey(101), {});
    tts.configured = false;
    const admin = await mintInterviewPrepTestToken("seed-admin");
    await patch(admin, { question: "編集したので旧音声は当てにならない" });

    const { app } = createTestApp(env);
    const learner = await mintInterviewPrepTestToken("seed-learner");

    const list = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: learner,
    });
    const body = (await list.json()) as { audioSegments: string[] };
    expect(body.audioSegments).not.toContain("101:question");

    const audio = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101/audio`, {
      method: "GET",
      token: learner,
    });
    expect(audio.status).toBe(404);
  });

  it("合成中に別の保存が本文を進めたら「作り直せた」と報告しない", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    // 合成に時間がかかる間に、 別の staff が同じ質問を保存した状況を作る。
    tts.synthesize = vi.fn(async () => {
      const q = state.questions?.find((x) => x.no === 101);
      if (q) q.question = "別の staff が先に確定させた文面";
      return new Uint8Array([1, 2, 3]);
    });

    const res = await patch(token, { question: "こちらの編集 (合成が遅い)" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      audio: { regenerated: string[]; stale: string[]; reason: string | null };
    };
    expect(body.audio.regenerated).toEqual([]);
    expect(body.audio.stale).toEqual(["101:question"]);
    expect(body.audio.reason).toMatch(/別の編集/);
  });

  it("正本へ戻す予約をしても、 本文が戻るまでは旧共通キーの音声を渡さない", async () => {
    // Codex レビュー (PR #246): 予約でその場で編集印を外すと、 本文は編集後のままなのに
    // 「編集していない行」に見え、 編集前の読み上げが受講者へ渡ってしまっていた。
    bucket.objects.set(legacyTtsKey(101), {});
    tts.configured = false;
    const admin = await mintInterviewPrepTestToken("seed-admin");
    const { app } = createTestApp(env);
    await patch(admin, { question: "編集した本文 (音声は作れていない)" });
    await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101/edit-mark`, {
      method: "DELETE",
      token: admin,
    });

    const learner = await mintInterviewPrepTestToken("seed-learner");
    const list = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: learner,
    });
    const body = (await list.json()) as { audioSegments: string[] };
    expect(body.audioSegments).not.toContain("101:question");

    const audio = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101/audio`, {
      method: "GET",
      token: learner,
    });
    expect(audio.status).toBe(404);
  });

  it("正本へ戻したあとは、 正本の読み上げ (旧共通キー) に戻る", async () => {
    // 編集 → 音声を作り直し → 正本へ戻す → seed が本文を戻す、 の後。 テナント側の
    // 音声は編集後の文面のまま残るが、 正本の読み上げは本文と合っているので使える。
    const admin = await mintInterviewPrepTestToken("seed-admin");
    await patch(admin, { question: "編集した本文" });
    expect(bucket.objects.has(ttsKey(101))).toBe(true);
    bucket.objects.set(legacyTtsKey(101), {});
    // seed が本文を正本へ戻し、 編集印も落ちた状態にする。
    const original = TEST_INTERVIEW_QUESTIONS[0]?.question as string;
    const q = state.questions?.find((x) => x.no === 101);
    if (q) q.question = original;
    state.questionEdits.delete(101);

    const { app } = createTestApp(env);
    const learner = await mintInterviewPrepTestToken("seed-learner");

    const list = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: learner,
    });
    const body = (await list.json()) as { audioSegments: string[]; audioStaleSegments: string[] };
    // 作り直しを促すのではなく、 正本の読み上げをそのまま渡す。
    expect(body.audioSegments).toContain("101:question");
    expect(body.audioStaleSegments).not.toContain("101:question");

    const audio = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101/audio`, {
      method: "GET",
      token: learner,
    });
    expect(audio.status).toBe(200);
  });

  it("他テナントの音声は列挙しない (テナントが増えても一覧は重くならない)", async () => {
    // 他テナント配下と、 旧共通キーと、 自テナントぶんを混在させる。
    bucket.objects.set("interview-tts/other-tenant/101.mp3", {});
    bucket.objects.set("interview-tts/other-tenant/999.mp3", {});
    bucket.objects.set(legacyTtsKey(101), {});
    const { app } = createTestApp(env);
    const admin = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, INTERVIEW_PREP_QUESTIONS_PATH, {
      method: "GET",
      token: admin,
    });

    const body = (await res.json()) as { audioSegments: string[] };
    expect(body.audioSegments).toEqual(["101:question"]); // 旧共通キーぶんだけ
    // 走査したのは自テナント配下と `interview-tts/` 直下のみ。
    const prefixes = bucket.list.mock.calls.map((c) => (c[0] as { prefix: string }).prefix);
    expect(prefixes).toContain("interview-tts/ses/");
    expect(prefixes.every((p) => p === "interview-tts/ses/" || p === "interview-tts/")).toBe(true);
    const flat = bucket.list.mock.calls
      .map((c) => c[0] as { prefix: string; delimiter?: string })
      .find((opts) => opts.prefix === "interview-tts/");
    expect(flat?.delimiter).toBe("/");
  });

  it("空にする保存の最中に深掘りが書き直されたら、 その音声は消さない", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    // 深掘りを足して音声も作っておく (fixture の deep1 は空)。
    await patch(token, { deep1: "最初の深掘り" });
    expect(bucket.objects.has(ttsKey(101, "deep1"))).toBe(true);

    // こちらが「空にする」保存を確定させた直後に、 別の staff の保存が着地した状況。
    state.afterQuestionUpdate = () => {
      state.afterQuestionUpdate = undefined;
      const row = state.questions?.find((x) => x.no === 101);
      if (row) row.deep1 = "別の staff が書き直した深掘り";
    };

    const res = await patch(token, { deep1: "" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { audio: { removed: string[] } };
    // 新しい本文に対して作られた音声を巻き添えで消さない。
    expect(body.audio.removed).toEqual([]);
    expect(bucket.objects.has(ttsKey(101, "deep1"))).toBe(true);
  });

  it("手動生成の最中に本文が変わったら、 成功として返さない", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    const { app } = createTestApp(env);
    // 合成に時間がかかる間に、 営業が同じ質問を保存した状況。
    tts.synthesize = vi.fn(async () => {
      const row = state.questions?.find((x) => x.no === 101);
      if (row) row.question = "営業が先に確定させた文面";
      return new Uint8Array([1, 2, 3]);
    });

    const res = await request(app, env, "/api/interview-prep/audio/generate", {
      method: "POST",
      body: JSON.stringify({ nos: [101] }),
      token,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: Array<{ no: number; ok: boolean; error?: string }>;
    };
    // 成功で返すと管理画面が「音声が古い」の印を消してしまう。
    expect(body.results[0]?.ok).toBe(false);
    expect(body.results[0]?.error).toMatch(/本文が変わりました/);
  });

  it("ロックを取れなかったら、 編集は保存するが R2 には一切触らない", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    // 先に音声を作っておく (この音声が壊されないことを確かめる)。
    await patch(token, { question: "先に作った文面" });
    const before = bucket.objects.get(ttsKey(101))?.customMetadata;
    tts.synthesize = vi.fn(async () => new Uint8Array([9, 9, 9]));
    bucket.put.mockClear();
    bucket.delete.mockClear();

    // 同じ質問への更新が進行中の状況。
    state.lockBusy = true;
    const res = await patch(token, { question: "ロックが取れないときの保存" });

    expect(res.status).toBe(200);
    // 編集そのものは落とさない。
    expect(state.questions?.find((q) => q.no === 101)?.question).toBe("ロックが取れないときの保存");
    // 直列化できていない以上、 音声は触らない (別のリクエストのぶんを壊さない)。
    expect(tts.synthesize).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(bucket.objects.get(ttsKey(101))?.customMetadata).toEqual(before);
    const body = (await res.json()) as { audio: { stale: string[]; reason: string | null } };
    expect(body.audio.stale).toEqual(["101:question"]);
    expect(body.audio.reason).toMatch(/更新が進行中/);
  });

  it("ロックを取れないときは、 深掘りを空にしても音声を消さない", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    await patch(token, { deep1: "消される前の深掘り" });
    expect(bucket.objects.has(ttsKey(101, "deep1"))).toBe(true);
    bucket.delete.mockClear();

    // 削除は `syncQuestionAudio` の先頭で走るので、 「理由」を渡すだけでは
    // 触らせない扱いにならない —— ロック未取得なら呼ばないこと自体を確かめる。
    state.lockBusy = true;
    const res = await patch(token, { deep1: "" });

    expect(res.status).toBe(200);
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(bucket.objects.has(ttsKey(101, "deep1"))).toBe(true);
    const body = (await res.json()) as { audio: { removed: string[]; stale: string[] } };
    expect(body.audio.removed).toEqual([]);
    expect(body.audio.stale).toEqual(["101:deep1"]);
  });

  it("手動生成もロックを取れなければそのセグメントを諦める", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");
    const { app } = createTestApp(env);
    state.lockBusy = true;

    const res = await request(app, env, "/api/interview-prep/audio/generate", {
      method: "POST",
      body: JSON.stringify({ nos: [101] }),
      token,
    });

    const body = (await res.json()) as {
      results: Array<{ ok: boolean; error?: string }>;
    };
    expect(body.results[0]?.ok).toBe(false);
    expect(body.results[0]?.error).toMatch(/編集中/);
    expect(bucket.objects.has(ttsKey(101))).toBe(false);
  });

  it("ロックは処理が終われば解放される (続けて保存できる)", async () => {
    const token = await mintInterviewPrepTestToken("seed-admin");

    await patch(token, { question: "1 回目" });
    const res = await patch(token, { question: "2 回目" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { audio: { regenerated: string[] } };
    expect(body.audio.regenerated).toEqual(["101:question"]);
    expect(state.locks.size).toBe(0);
  });

  it("質問番号に余計な文字が混ざったら 400 (101junk を 101 と読まない)", async () => {
    const { app } = createTestApp(env);
    const token = await mintInterviewPrepTestToken("seed-admin");

    const res = await request(app, env, `${INTERVIEW_PREP_QUESTIONS_PATH}/101junk`, {
      method: "PATCH",
      body: JSON.stringify({ question: "番号が不正" }),
      token,
    });

    expect(res.status).toBe(400);
  });
});
