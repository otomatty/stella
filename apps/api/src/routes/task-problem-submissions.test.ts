import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  contentHash as hashBytes,
  type TaskSubmissionInput,
} from "@stella/shared/tasks/submission";
import { parseTaskManifest, type TaskManifest } from "@stella/shared/tasks/manifest";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { getDb } from "../db/client.js";
import {
  aiReviewJobs,
  enrollments,
  notifications,
  profiles,
  sections,
  skillEvidence,
  skills,
  stages,
  submissionReviews,
  submissions,
  taskProblemResults,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { countedProblemIds } from "../lib/task-problem-submission.js";
import { reviewTaskSubmission } from "../lib/task-submission.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { submissionsRoute } from "./submissions.js";
import { tasksRoute } from "./tasks.js";

const TASK_ID = "csharp-foundations/u01/calc";
const CURRENT = "a".repeat(64);
const PROBLEMS = [
  { id: "q01-add", title: "足す" },
  { id: "q02-sub", title: "引く" },
];

describe("合格に数える問題", () => {
  const rows = [
    { problemId: "q01-add", contentHash: "old" },
    { problemId: "q02-sub", contentHash: CURRENT },
    { problemId: "q02-sub", contentHash: CURRENT },
  ] as const;

  it("未合格の課題は今の版だけを数え、重複させない", () => {
    expect(countedProblemIds(rows, CURRENT, false)).toEqual(new Set(["q02-sub"]));
  });

  it("合格済みの課題は前の版の結果も数える", () => {
    expect(countedProblemIds(rows, CURRENT, true)).toEqual(new Set(["q01-add", "q02-sub"]));
  });
});

describe("問題の提出", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let token: string;
  let otherToken: string;
  let instructorToken: string;
  let objects: Map<string, Uint8Array>;
  let plain: Awaited<ReturnType<typeof submissionFixture>>;

  beforeEach(async () => {
    database = sqliteD1();
    objects = new Map();
    env = {
      DB: database.binding,
      AUTH_JWT_SECRET: "test-secret",
      SUBMISSIONS_BUCKET: {
        put: vi.fn(async (key: string, data: Uint8Array) => {
          objects.set(key, data);
        }),
        get: vi.fn(async (key: string) => {
          const data = objects.get(key);
          return data ? { arrayBuffer: async () => data.buffer } : null;
        }),
        delete: vi.fn(async (keys: string | string[]) => {
          for (const key of typeof keys === "string" ? [keys] : keys) objects.delete(key);
        }),
      },
    } as unknown as Env;
    db = getDb(env);
    plain = await submissionFixture();
    const built = await problemBundle(CURRENT, PROBLEMS);
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "learner", displayName: "受講者", role: "student" },
        { id: "teacher", displayName: "講師", role: "instructor" },
        { id: "other", displayName: "他の受講者", role: "student" },
      ]),
      db.insert(stages).values({
        id: "stage",
        slug: "csharp-foundations",
        title: "C# の基礎",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "計算" }),
      db.insert(enrollments).values({ userId: "learner", stageId: "stage", status: "active" }),
      db.insert(skills).values({ id: "calc", title: "計算" }),
      db.insert(tasks).values([
        {
          id: TASK_ID,
          sectionId: "unit",
          title: "計算",
          kind: "basic",
          pattern: "calc",
          skills: { uses: [], assesses: ["calc"] },
          estimatedMinutes: 20,
          order: 0,
          contentHash: CURRENT,
          definition: JSON.stringify(built.definition),
          bundle: JSON.stringify(built.bundle),
        },
        {
          id: plain.input.taskId,
          sectionId: "unit",
          title: "ページ",
          kind: "basic",
          pattern: "page",
          skills: { uses: [], assesses: [] },
          estimatedMinutes: 10,
          order: 1,
          contentHash: plain.bundle.contentHash,
          definition: JSON.stringify({
            submit: { explanation: true, debuggingRecord: false },
            skills: { assesses: [] },
          }),
          bundle: JSON.stringify(plain.bundle),
        },
      ]),
      db.insert(taskRevisions).values([
        {
          taskId: TASK_ID,
          contentHash: CURRENT,
          definition: JSON.stringify(built.definition),
          bundle: JSON.stringify(built.bundle),
        },
        {
          taskId: plain.input.taskId,
          contentHash: plain.bundle.contentHash,
          definition: JSON.stringify({
            submit: { explanation: true, debuggingRecord: false },
            skills: { assesses: [] },
          }),
          bundle: JSON.stringify(plain.bundle),
        },
      ]),
    ]);
    token = await signAccessToken("test-secret", "learner", "test@example.com");
    otherToken = await signAccessToken("test-secret", "other", "other@example.com");
    instructorToken = await signAccessToken("test-secret", "teacher", "teacher@example.com");
  });
  afterEach(() => database.sqlite.close());

  function app() {
    return mountTestApp(env, submissionsRoute, tasksRoute).app;
  }
  async function post(body: unknown, as = token) {
    return request(app(), env, "/api/submissions", {
      method: "POST",
      token: as,
      body: JSON.stringify(body),
    });
  }
  async function submitProblem(problemId: string, source?: string) {
    const response = await post(await problemInput(CURRENT, PROBLEMS, problemId, source));
    expect(response.status, await response.clone().text()).toBe(201);
    return json<{
      problemId: string;
      passedProblems: number;
      totalProblems: number;
      taskPassed: boolean;
    }>(response);
  }

  it("問題が揃うまで課題の提出を作らず、最後の問題でテスト確定する", async () => {
    const first = await submitProblem("q01-add", "export const add = 1;\n");
    expect(first).toEqual({
      problemId: "q01-add",
      passedProblems: 1,
      totalProblems: 2,
      taskPassed: false,
    });
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(aiReviewJobs)).toEqual([]);
    expect(await db.select().from(notifications)).toEqual([]);
    const saved = await db.select().from(taskProblemResults);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      userId: "learner",
      problemId: "q01-add",
      attempts: 1,
      contentHash: CURRENT,
      path: "src/q01-add.ts",
      code: "export const add = 1;\n",
    });
    const passedAt = saved[0]?.firstPassedAt.getTime();
    expect((await db.select().from(taskProgress))[0]?.status).toBe("local-passed");

    const again = await submitProblem("q01-add", "export const add = 2;\n");
    expect(again.taskPassed).toBe(false);
    expect(await db.select().from(submissions)).toEqual([]);
    const resubmitted = (await db.select().from(taskProblemResults))[0];
    expect(resubmitted?.attempts).toBe(2);
    expect(resubmitted?.firstPassedAt.getTime()).toBe(passedAt);
    expect(resubmitted?.code).toBe("export const add = 2;\n");

    const stage = await json<{ tasks: Record<string, unknown>[] }>(
      await request(app(), env, "/api/tasks/for-stage/stage", { token }),
    );
    const problemTask = stage.tasks.find((task) => task.id === TASK_ID);
    const plainTask = stage.tasks.find((task) => task.id === plain.input.taskId);
    expect(problemTask).toMatchObject({ problems_total: 2, problems_passed: 1 });
    expect(plainTask).not.toHaveProperty("problems_total");
    expect(plainTask).not.toHaveProperty("problems_passed");

    const done = await submitProblem("q02-sub", "export const sub = 1;\n");
    expect(done).toEqual({
      problemId: "q02-sub",
      passedProblems: 2,
      totalProblems: 2,
      taskPassed: true,
    });
    const rows = await db.select().from(submissions);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reviewSource: "tests",
      verdict: "pass",
      reviewerId: null,
      aiReviewStatus: null,
      explanation: "",
      submissionMode: "submit",
    });
    expect(await db.select().from(aiReviewJobs)).toEqual([]);
    expect(await db.select().from(notifications)).toEqual([]);
    expect((await db.select().from(taskProgress))[0]?.status).toBe("passed");
    expect(await db.select().from(submissionReviews)).toEqual([]);
    expect(await db.select().from(skillEvidence)).toMatchObject([
      { userId: "learner", skillId: "calc", level: "independent" },
    ]);

    await db.insert(taskProblemResults).values({
      userId: "other",
      taskId: TASK_ID,
      problemId: "q09-leak",
      contentHash: CURRENT,
      path: "src/q09-leak.ts",
      code: "LEAKED-OTHER",
      sha256: "b".repeat(64),
      attempts: 1,
      firstPassedAt: new Date(),
      updatedAt: new Date(),
    });
    const detail = await json<{ row: { code: string; files: { path: string }[] } }>(
      await request(app(), env, `/api/submissions/${rows[0]?.id}`, { token: instructorToken }),
    );
    expect(detail.row.files.map((file) => file.path).sort()).toEqual([
      "src/q01-add.ts",
      "src/q02-sub.ts",
    ]);
    expect(detail.row.code).toContain("export const add = 2;");
    expect(detail.row.code).toContain("export const sub = 1;");
    expect(detail.row.code).not.toContain("LEAKED-OTHER");
    expect(objects.size).toBe(0);

    const listed = await json<{
      problems: { id: string; status: string; firstPassedAt: string | null }[];
      passedProblems: number;
      totalProblems: number;
      taskPassed: boolean;
    }>(
      await request(
        app(),
        env,
        `/api/tasks/problem-results?taskId=${encodeURIComponent(TASK_ID)}`,
        { token },
      ),
    );
    expect(listed.taskPassed).toBe(true);
    expect(listed.passedProblems).toBe(2);
    expect(listed.totalProblems).toBe(2);
    expect(listed.problems.map((problem) => problem.id)).toEqual(["q01-add", "q02-sub"]);
    expect(
      listed.problems.every((problem) => problem.status === "passed" && problem.firstPassedAt),
    ).toBe(true);

    await submitProblem("q02-sub", "export const sub = 3;\n");
    expect(await db.select().from(submissions)).toHaveLength(1);
    expect(await db.select().from(submissionReviews)).toHaveLength(0);
    const second = (await db.select().from(taskProblemResults)).find(
      (row) => row.problemId === "q02-sub",
    );
    expect(second?.attempts).toBe(2);
    expect(second?.code).toBe("export const sub = 3;\n");
  });

  it("テストで確定しても submission_reviews に行が増えず、人の訂正は通る", async () => {
    await submitProblem("q01-add");
    await submitProblem("q02-sub");
    expect(await db.select().from(submissionReviews)).toEqual([]);
    const [row] = await db.select().from(submissions);
    const [before] = await db.select().from(taskProgress);
    expect(before?.status).toBe("passed");
    expect(before?.passedAt).toBeInstanceOf(Date);
    if (!row) throw new Error("提出がありません");
    await reviewTaskSubmission(
      db,
      { id: "teacher", role: "instructor", name: "講師", email: null },
      row.id,
      "resubmit",
      "訂正",
    );
    expect(await db.select().from(submissionReviews)).toMatchObject([
      { source: "human", verdict: "resubmit", reviewerId: "teacher" },
    ]);
    const [after] = await db.select().from(taskProgress);
    expect(after?.status).toBe("resubmit");
    expect(after?.passedAt?.getTime()).toBe(before?.passedAt?.getTime());
  });

  it("照合に落ちた提出は何も記録しない", async () => {
    const cases: Array<(input: TaskSubmissionInput) => void> = [
      (input) => {
        input.localResult.outcome = "failed";
        input.localResult.steps = input.localResult.steps.map((item) =>
          item.id === "test" ? { ...item, status: "failed" } : item,
        );
      },
      (input) => {
        input.protected = input.protected.map((file) => ({ ...file, sha256: "b".repeat(64) }));
        input.localResult.protected = input.protected;
      },
      (input) => {
        input.problemId = "q99-missing";
        input.localResult.problemId = "q99-missing";
        input.files[0].path = "src/q99-missing.ts";
        input.localResult.files[0].path = "src/q99-missing.ts";
      },
      (input) => {
        input.files[0].path = "src/q02-sub.ts";
        input.localResult.files[0].path = "src/q02-sub.ts";
      },
      (input) => {
        const source = "a".repeat(64 * 1024 + 1);
        input.files[0].content = Buffer.from(source).toString("base64");
      },
    ];
    for (const tweak of cases) {
      const input = await problemInput(CURRENT, PROBLEMS, "q01-add", "export const add = 1;\n");
      tweak(input);
      if (tweak === cases[4]) {
        const bytes = new TextEncoder().encode("a".repeat(64 * 1024 + 1));
        input.localResult.files[0].sha256 = await hashBytes(bytes);
        input.localResult.files[0].bytes = bytes.length;
      }
      const response = await post(input);
      expect(response.status, await response.clone().text()).toBe(400);
    }
    const missing = await problemInput(CURRENT, PROBLEMS, "q01-add");
    delete missing.problemId;
    const rejected = await post(missing);
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toMatchObject({ error: "拡張を更新してください" });
    expect(await db.select().from(taskProblemResults)).toEqual([]);
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(taskProgress)).toEqual([]);
    expect(await db.select().from(aiReviewJobs)).toEqual([]);
  });

  it("受講していない課題は 404、知らない版は 409、古い版も 409", async () => {
    const input = await problemInput(CURRENT, PROBLEMS, "q01-add");
    expect((await post(input, otherToken)).status).toBe(404);
    expect(
      (
        await request(
          app(),
          env,
          `/api/tasks/problem-results?taskId=${encodeURIComponent(TASK_ID)}`,
          {
            token: otherToken,
          },
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(app(), env, "/api/tasks/problem-results?taskId=missing", { token })).status,
    ).toBe(404);
    expect(
      (
        await request(app(), env, `/api/tasks/problem-results?taskId=${plain.input.taskId}`, {
          token,
        })
      ).status,
    ).toBe(404);

    const unknown = await problemInput(CURRENT, PROBLEMS, "q01-add");
    unknown.contentHash = "c".repeat(64);
    expect((await post(unknown)).status).toBe(409);

    const oldHash = "b".repeat(64);
    const oldProblems = [...PROBLEMS, { id: "q03-old", title: "旧問" }];
    const old = await problemBundle(oldHash, oldProblems);
    await db.insert(taskRevisions).values({
      taskId: TASK_ID,
      contentHash: oldHash,
      definition: JSON.stringify(old.definition),
      bundle: JSON.stringify(old.bundle),
    });
    const response = await post(
      await problemInput(oldHash, oldProblems, "q03-old", "export const old = 1;\n"),
    );
    expect(response.status, await response.clone().text()).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "教材が更新されています。課題を開き直してください",
    });
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(taskProblemResults)).toEqual([]);
    expect(await db.select().from(taskProgress)).toEqual([]);
    const listed = await json<{ problems: { id: string }[]; passedProblems: number }>(
      await request(
        app(),
        env,
        `/api/tasks/problem-results?taskId=${encodeURIComponent(TASK_ID)}`,
        {
          token,
        },
      ),
    );
    expect(listed.problems.map((problem) => problem.id)).toEqual(["q01-add", "q02-sub"]);
    expect(listed.passedProblems).toBe(0);
  });

  it("前の版の結果は数えず、今の版で全問を提出してから課題を合格にする", async () => {
    await db.insert(taskProblemResults).values({
      userId: "learner",
      taskId: TASK_ID,
      problemId: "q01-add",
      contentHash: "b".repeat(64),
      path: "src/q01-add.ts",
      code: "export const add = 1;\n",
      sha256: "c".repeat(64),
      attempts: 1,
      firstPassedAt: new Date("2026-11-01T00:00:00Z"),
      updatedAt: new Date("2026-11-01T00:00:00Z"),
    });

    const partial = await submitProblem("q02-sub");
    expect(partial).toEqual({
      problemId: "q02-sub",
      passedProblems: 1,
      totalProblems: 2,
      taskPassed: false,
    });
    expect(await db.select().from(submissions)).toEqual([]);
    expect((await db.select().from(taskProgress))[0]?.status).toBe("local-passed");

    const listed = await json<{
      problems: { id: string; status: string; firstPassedAt: string | null }[];
      passedProblems: number;
      taskPassed: boolean;
    }>(
      await request(
        app(),
        env,
        `/api/tasks/problem-results?taskId=${encodeURIComponent(TASK_ID)}`,
        { token },
      ),
    );
    expect(listed).toMatchObject({ passedProblems: 1, taskPassed: false });
    expect(listed.problems.find((problem) => problem.id === "q01-add")).toMatchObject({
      status: "not-submitted",
      firstPassedAt: null,
    });
    expect(listed.problems.find((problem) => problem.id === "q02-sub")).toMatchObject({
      status: "passed",
      firstPassedAt: expect.any(String),
    });
    const stage = await json<{ tasks: Record<string, unknown>[] }>(
      await request(app(), env, "/api/tasks/for-stage/stage", { token }),
    );
    expect(stage.tasks.find((task) => task.id === TASK_ID)).toMatchObject({
      problems_total: 2,
      problems_passed: 1,
    });

    expect(await submitProblem("q01-add")).toMatchObject({
      passedProblems: 2,
      taskPassed: true,
    });
    expect(await db.select().from(submissions)).toMatchObject([
      { verdict: "pass", taskContentHash: CURRENT },
    ]);
  });

  it("合格済みの課題は教材が更新されても問題の合格件数を保つ", async () => {
    await submitProblem("q01-add");
    await submitProblem("q02-sub");
    const saved = await db.select().from(taskProblemResults);
    const updatedHash = "d".repeat(64);
    const updated = await problemBundle(updatedHash, PROBLEMS);
    await db.batch([
      db.insert(taskRevisions).values({
        taskId: TASK_ID,
        contentHash: updatedHash,
        definition: JSON.stringify(updated.definition),
        bundle: JSON.stringify(updated.bundle),
      }),
      db
        .update(tasks)
        .set({
          contentHash: updatedHash,
          definition: JSON.stringify(updated.definition),
          bundle: JSON.stringify(updated.bundle),
        })
        .where(eq(tasks.id, TASK_ID)),
    ]);
    const listed = await json<{
      problems: { id: string; status: string; firstPassedAt: string | null }[];
      passedProblems: number;
      taskPassed: boolean;
    }>(
      await request(
        app(),
        env,
        `/api/tasks/problem-results?taskId=${encodeURIComponent(TASK_ID)}`,
        { token },
      ),
    );
    expect(listed).toMatchObject({ passedProblems: 2, taskPassed: true });
    expect(listed.problems).toEqual(
      PROBLEMS.map((problem) => ({
        ...problem,
        status: "passed",
        firstPassedAt: saved
          .find((row) => row.problemId === problem.id)
          ?.firstPassedAt.toISOString(),
      })),
    );
    const stage = await json<{ tasks: Record<string, unknown>[] }>(
      await request(app(), env, "/api/tasks/for-stage/stage", { token }),
    );
    expect(stage.tasks.find((task) => task.id === TASK_ID)).toMatchObject({
      status: "passed",
      problems_total: 2,
      problems_passed: 2,
    });
  });

  it("問題の id を付けた相談は課題の提出として受け、問題の合格結果を作らない", async () => {
    const consult = await problemInput(CURRENT, PROBLEMS, "q01-add");
    consult.mode = "consult";
    consult.explanation = "足し算のテストが通りません";
    consult.localResult.outcome = "failed";
    consult.localResult.steps = consult.localResult.steps.map((step) =>
      step.id === "test" ? { ...step, status: "failed" } : step,
    );
    const response = await post(consult);
    expect(response.status, await response.clone().text()).toBe(201);
    expect(await response.json()).toMatchObject({
      row: { id: expect.any(String), attempt: 1 },
    });
    expect(await db.select().from(taskProblemResults)).toEqual([]);
    expect(await db.select().from(submissions)).toMatchObject([
      { submissionMode: "consult", localResult: { problemId: "q01-add" } },
    ]);
  });

  it("相談と、問題の無い課題は AI の待ち行列に積む", async () => {
    const consult = await problemInput(CURRENT, PROBLEMS, "q01-add");
    consult.mode = "consult";
    delete consult.problemId;
    const consulted = await post(consult);
    expect(consulted.status, await consulted.clone().text()).toBe(201);
    expect(await consulted.json()).toHaveProperty("row");
    expect(await db.select().from(taskProblemResults)).toEqual([]);
    expect((await db.select().from(aiReviewJobs)).length).toBe(1);

    const plainResponse = await post(plain.input);
    expect(plainResponse.status, await plainResponse.clone().text()).toBe(201);
    expect((await db.select().from(aiReviewJobs)).length).toBe(2);
    expect(
      (await db.select().from(submissions)).find((row) => row.taskId === plain.input.taskId)
        ?.aiReviewStatus,
    ).toBe("queued");
  });
});

async function problemBundle(contentHash: string, problems: { id: string; title: string }[]) {
  const manifest: TaskManifest = {
    schemaVersion: 1,
    id: TASK_ID,
    title: "計算",
    kind: "basic",
    runner: "node-test",
    problems,
    submit: { files: ["src/**/*.ts"] },
    protected: ["tests/**/*.test.ts"],
    checks: { lint: false, format: false },
  };
  const parsed = parseTaskManifest(manifest);
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  const manifestText = JSON.stringify(parsed.manifest);
  const encoder = new TextEncoder();
  const files: Record<string, string> = {
    ".stella/task.json": Buffer.from(manifestText).toString("base64"),
    "README.md": Buffer.from("# 計算").toString("base64"),
  };
  const protectedFiles = [];
  for (const problem of problems) {
    const test = `test("${problem.id}", () => {});\n`;
    const bytes = encoder.encode(test);
    files[`tests/${problem.id}.test.ts`] = Buffer.from(test).toString("base64");
    protectedFiles.push({
      path: `tests/${problem.id}.test.ts`,
      sha256: await hashBytes(bytes),
      bytes: bytes.length,
    });
  }
  const bundle: TaskBundle = { manifest: parsed.manifest, contentHash, files };
  const definition = {
    submit: { explanation: true, debuggingRecord: true },
    skills: { assesses: ["calc"] },
    problems,
  };
  return { bundle, definition, manifestText, protectedFiles };
}

async function problemInput(
  contentHash: string,
  problems: { id: string; title: string }[],
  problemId: string,
  source = "export const value = 1;\n",
): Promise<TaskSubmissionInput> {
  const built = await problemBundle(contentHash, problems);
  const bytes = new TextEncoder().encode(source);
  const path = `src/${problemId}.ts`;
  const hashed = { path, sha256: await hashBytes(bytes), bytes: bytes.length };
  return {
    taskId: TASK_ID,
    contentHash,
    mode: "submit",
    problemId,
    files: [{ path, content: Buffer.from(source).toString("base64") }],
    explanation: "",
    support: [],
    protected: built.protectedFiles,
    localResult: {
      schemaVersion: 1,
      taskId: TASK_ID,
      runner: "node-test",
      outcome: "passed",
      startedAt: "2026-11-06T00:00:00Z",
      durationMs: 1,
      platform: "win32",
      toolVersions: {},
      problemId,
      steps: [
        { id: "deps", label: "依存", status: "passed", durationMs: 1, summary: "ok" },
        { id: "test", label: "テスト", status: "passed", durationMs: 1, summary: "ok" },
      ],
      files: [hashed],
      protected: built.protectedFiles,
      manifestSha256: await hashBytes(new TextEncoder().encode(built.manifestText)),
    },
  };
}
