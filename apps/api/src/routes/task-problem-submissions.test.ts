import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  contentHash as hashBytes,
  type TaskSubmissionInput,
} from "@stella/shared/tasks/submission";
import { parseTaskManifest, type TaskManifest } from "@stella/shared/tasks/manifest";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import type { GradebookEntry, StageCompletion } from "@stella/shared/cms/types";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { getDb } from "../db/client.js";
import {
  aiReviewJobs,
  auditLogs,
  certificates,
  contentUnits,
  lessons,
  enrollments,
  notifications,
  profiles,
  resourceLocks,
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
import * as stageAutoComplete from "../lib/stage-auto-complete.js";
import { countedProblemIds, submitTaskProblem } from "../lib/task-problem-submission.js";
import { reviewTaskSubmission } from "../lib/task-submission.js";
import * as taskSubmission from "../lib/task-submission.js";
import * as problemSubmission from "../lib/task-problem-submission.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { submissionsRoute } from "./submissions.js";
import { taskManualCompletionRoute } from "./task-manual-completion.js";
import { collectMemoMaterial } from "../lib/mentor-memo.js";
import { loadLearningPace } from "../lib/learning-pace.js";
import { readSubmissionFiles } from "../lib/task-submission.js";
import { taskCompletionCounts, manualCompletionCounts } from "../lib/task-completion.js";
import { readManualCompletion } from "../lib/task-manual-completion.js";
import { taskSubmissionLockId } from "../lib/task-submission.js";
import { tasksRoute } from "./tasks.js";
import { certificatesRoute } from "./certificates.js";
import { reviewDeskRoute } from "./review-desk.js";

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
        { id: "teacher", displayName: "講師", role: "admin" },
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
    return mountTestApp(
      env,
      submissionsRoute,
      tasksRoute,
      taskManualCompletionRoute,
      certificatesRoute,
      reviewDeskRoute,
    ).app;
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

  async function manual(
    problemIds?: string[],
    revoke = false,
    taskId = TASK_ID,
    as = instructorToken,
    reason = "別の学習環境で確認済み",
  ) {
    return request(app(), env, `/api/task-manual-completion${revoke ? "/revoke" : ""}`, {
      method: "POST",
      token: as,
      body: JSON.stringify({
        userId: "learner",
        stageId: "stage",
        items: [{ taskId, ...(problemIds ? { problemIds } : {}) }],
        reason,
      }),
    });
  }

  it.each([false, true])(
    "全問manualのあと本人が全問を解くと、合格を途切れさせずtestsと本人の合格日に置き換える (修了証あり=%s)",
    async (withCertificate) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        const importedAt = new Date("2026-11-02T03:00:00Z");
        const solvedAt = new Date("2026-11-10T03:00:00Z");
        vi.setSystemTime(importedAt);
        if (withCertificate) {
          await db.insert(lessons).values({
            id: "replacement-lesson",
            sectionId: "unit",
            title: "架空の課題文",
            type: "text",
          });
          await db
            .update(stages)
            .set({ requireAllLessons: false, requireQuizPass: false, autoIssueCertificate: true })
            .where(eq(stages.id, "stage"));
          await manual(undefined, false, plain.input.taskId);
        }
        await manual();
        const beforeCertificates = await db.select().from(certificates);
        expect(beforeCertificates).toHaveLength(withCertificate ? 1 : 0);
        const observations: { status: unknown; passes: unknown }[] = [];
        const batch = database.binding.batch.bind(database.binding);
        database.binding.batch = async <T>(statements: D1PreparedStatement[]) => {
          const result = await batch<T>(statements);
          observations.push(
            database.sqlite
              .prepare(
                "select status, (select count(*) from submissions where task_id = ? and verdict = 'pass') as passes from task_progress where task_id = ?",
              )
              .get(TASK_ID, TASK_ID) as { status: unknown; passes: unknown },
          );
          return result;
        };
        vi.setSystemTime(solvedAt);
        // 修了後の書き込みを許すかは既存の認可の責務。ここでは確定処理の原子性を直接検証する。
        const replay = async (problemId: string) =>
          withCertificate
            ? submitTaskProblem(
                db,
                { id: "learner", role: "student", name: "架空の受講者", email: null },
                await problemInput(CURRENT, PROBLEMS, problemId),
                {
                  id: TASK_ID,
                  stageTitle: "架空のステージ",
                  sectionTitle: "架空の単元",
                  contentHash: CURRENT,
                  stageSlug: "csharp-foundations",
                  privateFiles: null,
                },
                (await problemBundle(CURRENT, PROBLEMS)).bundle,
              )
            : submitProblem(problemId);
        await replay("q01-add");
        expect(
          (await db.select().from(submissions)).filter((r) => r.taskId === TASK_ID),
        ).toMatchObject([{ reviewSource: "manual", verdict: "pass" }]);
        expect(await db.select().from(skillEvidence)).toEqual([]);
        await replay("q02-sub");
        const passes = (await db.select().from(submissions)).filter((r) => r.taskId === TASK_ID);
        expect(passes).toMatchObject([
          { reviewSource: "tests", verdict: "pass", reviewedAt: solvedAt },
        ]);
        expect(passes).toHaveLength(1);
        expect(await db.select().from(skillEvidence)).toMatchObject([
          { submissionId: passes[0].id, skillId: "calc" },
        ]);
        expect(
          (await db.select().from(taskProgress)).find((r) => r.taskId === TASK_ID),
        ).toMatchObject({ status: "passed", passedAt: solvedAt });
        expect(observations.length).toBeGreaterThan(0);
        expect(observations.every((r) => r.status === "passed" && r.passes === 1)).toBe(true);
        expect(await db.select().from(certificates)).toEqual(beforeCertificates);
        expect((await db.select().from(enrollments))[0].status).toBe(
          withCertificate ? "completed" : "active",
        );
        vi.setSystemTime(new Date("2026-11-11T03:00:00Z"));
        await replay("q01-add");
        expect(
          (await db.select().from(taskProgress)).find((r) => r.taskId === TASK_ID)?.passedAt,
        ).toEqual(solvedAt);
        const view = await readManualCompletion(db, "learner", "stage");
        expect(view.units.flatMap((u) => u.tasks).find((t) => t.id === TASK_ID)).toMatchObject({
          reviewSource: "tests",
          manualReason: null,
        });
        expect(
          (await manualCompletionCounts(db, "stage", ["learner"])).get("learner"),
        ).toMatchObject({ manual_tasks: withCertificate ? 1 : 0, manual_problems: 0 });
        expect((await manual(undefined, true)).status).toBe(409);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it("manual合格の取消しで本人の問題の相談のレビュー待ちを消さない", async () => {
    await submitProblem("q01-add");
    await manual(["q02-sub"]);
    const consult = await problemInput(CURRENT, PROBLEMS, "q02-sub");
    consult.mode = "consult";
    consult.explanation = "架空の問題について相談します";
    consult.localResult.outcome = "failed";
    const response = await post(consult);
    expect(response.status).toBe(201);
    const { row } = await json<{ row: { id: string } }>(response);
    expect((await manual(["q02-sub"], true)).status).toBe(200);
    expect(await db.select().from(submissions)).toMatchObject([
      { id: row.id, verdict: null, submissionMode: "consult" },
    ]);
    expect((await db.select().from(taskProgress))[0]).toMatchObject({
      status: "instructor-pending",
      passedAt: null,
    });
  });

  it.each(["human", "ai"] as const)(
    "問題なしのmanual合格を本人の%s合格と合格日に置き換え、ペースと育成メモに数える",
    async (source) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        const importedAt = new Date("2026-11-02T03:00:00Z");
        const solvedAt = new Date("2026-11-10T03:00:00Z");
        vi.setSystemTime(importedAt);
        await db
          .insert(contentUnits)
          .values({ sectionId: "unit", plannedHours: 1, skills: { uses: [], assesses: [] } });
        await db.update(stages).set({ slug: "dev-env-basics" }).where(eq(stages.id, "stage"));
        await db
          .update(tasks)
          .set({ kind: "assessment-a", pattern: "page" })
          .where(eq(tasks.id, plain.input.taskId));
        await db
          .update(tasks)
          .set({ kind: "assessment-b", pattern: "page" })
          .where(eq(tasks.id, TASK_ID));
        await manual(undefined, false, plain.input.taskId);
        const learner = {
          id: "learner",
          role: "student" as const,
          name: "架空の受講者",
          email: null,
        };
        expect((await loadLearningPace(db, learner, "2026-11-16")).assessments).toEqual([]);
        expect(
          (await collectMemoMaterial(db, learner, "2026-11-02", new Date("2026-11-09T03:00:00Z")))
            .passedTaskCount,
        ).toBe(0);
        vi.setSystemTime(solvedAt);
        const response = await post(plain.input);
        expect(response.status).toBe(201);
        const { row } = await json<{ row: { id: string } }>(response);
        await reviewTaskSubmission(
          db,
          { id: "teacher", role: "admin", name: "架空の管理者", email: null },
          row.id,
          "pass",
          "確認済み",
          source,
        );
        expect(
          (await db.select().from(taskProgress)).find((r) => r.taskId === plain.input.taskId),
        ).toMatchObject({ status: source === "ai" ? "ai-passed" : "passed", passedAt: solvedAt });
        expect(
          (await db.select().from(submissions)).filter((r) => r.taskId === plain.input.taskId),
        ).toMatchObject([{ id: row.id, reviewSource: source }]);
        expect(
          (await db.select().from(submissions)).filter((r) => r.reviewSource === "manual"),
        ).toEqual([]);
        expect((await loadLearningPace(db, learner, "2026-11-16")).assessments).toMatchObject([
          { dueDate: "2026-11-17" },
        ]);
        expect(
          (await collectMemoMaterial(db, learner, "2026-11-09", new Date("2026-11-16T03:00:00Z")))
            .passedTaskCount,
        ).toBe(1);
        expect((await manualCompletionCounts(db, "stage", ["learner"])).get("learner")).toEqual({
          manual_tasks: 0,
          manual_problems: 0,
        });
        const view = await readManualCompletion(db, "learner", "stage");
        expect(
          view.units.flatMap((u) => u.tasks).find((t) => t.id === plain.input.taskId),
        ).toMatchObject({ reviewSource: source, manualReason: null });
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each(["human", "ai", "tests", null] as const)(
    "旧データにmanualと本人の合格(%s)が混在しても、ペースと育成メモは本人の合格を数える",
    async (source) => {
      const at = new Date("2026-11-10T03:00:00Z");
      await db
        .insert(contentUnits)
        .values({ sectionId: "unit", plannedHours: 1, skills: { uses: [], assesses: [] } });
      await db.update(stages).set({ slug: "dev-env-basics" }).where(eq(stages.id, "stage"));
      await db
        .update(tasks)
        .set({ kind: "assessment-a", pattern: "page" })
        .where(eq(tasks.id, plain.input.taskId));
      await db
        .update(tasks)
        .set({ kind: "assessment-b", pattern: "page" })
        .where(eq(tasks.id, TASK_ID));
      await manual(undefined, false, plain.input.taskId);
      await db.insert(submissions).values({
        studentId: "learner",
        taskId: plain.input.taskId,
        taskContentHash: plain.bundle.contentHash,
        stageTitle: "架空のステージ",
        assignmentTitle: "架空の課題",
        code: "",
        verdict: "pass",
        reviewSource: source,
        attempt: 2,
        submittedAt: at,
        reviewedAt: at,
      });
      await db
        .update(taskProgress)
        .set({ passedAt: at })
        .where(eq(taskProgress.taskId, plain.input.taskId));
      const learner = {
        id: "learner",
        role: "student" as const,
        name: "架空の受講者",
        email: null,
      };
      expect((await loadLearningPace(db, learner, "2026-11-16")).assessments).toMatchObject([
        { dueDate: "2026-11-17" },
      ]);
      expect(
        (await collectMemoMaterial(db, learner, "2026-11-09", new Date("2026-11-16T03:00:00Z")))
          .passedTaskCount,
      ).toBe(1);
    },
  );

  it.each([false, true])(
    "途中のロック競合でも保存した分のステージと修了証を付け直す（取り消し=%s）",
    async (revoke) => {
      await db
        .insert(lessons)
        .values({ id: "partial-lesson", sectionId: "unit", title: "架空の課題文", type: "text" });
      await db
        .update(stages)
        .set({ requireAllLessons: false, requireQuizPass: false, autoIssueCertificate: true })
        .where(eq(stages.id, "stage"));
      await manual(undefined, false, plain.input.taskId);
      if (revoke) await manual();
      expect((await db.select().from(certificates)).length).toBe(revoke ? 1 : 0);
      await db.insert(resourceLocks).values({
        id: taskSubmissionLockId("learner", plain.input.taskId),
        holder: "another-request",
        expiresAt: new Date(Date.now() + 60_000),
      });
      const response = await request(
        app(),
        env,
        `/api/task-manual-completion${revoke ? "/revoke" : ""}`,
        {
          method: "POST",
          token: instructorToken,
          body: JSON.stringify({
            userId: "learner",
            stageId: "stage",
            items: [{ taskId: TASK_ID }, { taskId: plain.input.taskId }],
            reason: "架空の学習の引き継ぎ",
          }),
        },
      );
      expect(response.status).toBe(409);
      expect(await response.text()).toContain("一部は保存済みです");
      expect(
        (await db.select().from(submissions)).filter((r) => r.taskId === TASK_ID),
      ).toHaveLength(revoke ? 0 : 1);
      expect(
        (await db.select().from(submissions)).filter((r) => r.taskId === plain.input.taskId),
      ).toHaveLength(1);
      expect((await db.select().from(enrollments))[0].status).toBe(revoke ? "active" : "completed");
      expect(await db.select().from(certificates)).toHaveLength(revoke ? 0 : 1);
    },
  );

  it.each([false, true])(
    "途中停止後の付け直しが失敗しても元の409を返す（取り消し=%s）",
    async (revoke) => {
      if (revoke) {
        await manual();
        await manual(undefined, false, plain.input.taskId);
      }
      await db.insert(resourceLocks).values({
        id: taskSubmissionLockId("learner", plain.input.taskId),
        holder: "another-request",
        expiresAt: new Date(Date.now() + 60_000),
      });
      const reconcile = vi
        .spyOn(
          stageAutoComplete,
          revoke ? "reclaimAutoCertificatesIfUnmet" : "autoCompleteStagesIfMet",
        )
        .mockRejectedValueOnce(new Error("架空の付け直しエラー"));
      const logged = vi.spyOn(console, "error").mockImplementation(() => {
        /* 意図した付け直しの失敗ログを抑える。 */
      });
      try {
        const response = await request(
          app(),
          env,
          `/api/task-manual-completion${revoke ? "/revoke" : ""}`,
          {
            method: "POST",
            token: instructorToken,
            body: JSON.stringify({
              userId: "learner",
              stageId: "stage",
              items: [{ taskId: TASK_ID }, { taskId: plain.input.taskId }],
              reason: "架空の学習の引き継ぎ",
            }),
          },
        );
        expect(response.status).toBe(409);
        expect(await response.text()).toContain("一部は保存済みです");
        expect(reconcile).toHaveBeenCalledOnce();
      } finally {
        reconcile.mockRestore();
        logged.mockRestore();
      }
    },
  );

  async function replaceProblems(problems: { id: string; title: string }[]) {
    const hash = "e".repeat(64);
    const built = await problemBundle(hash, problems);
    await db.batch([
      db.insert(taskRevisions).values({
        taskId: TASK_ID,
        contentHash: hash,
        definition: JSON.stringify(built.definition),
        bundle: JSON.stringify(built.bundle),
      }),
      db
        .update(tasks)
        .set({
          contentHash: hash,
          definition: JSON.stringify(built.definition),
          bundle: JSON.stringify(built.bundle),
        })
        .where(eq(tasks.id, TASK_ID)),
    ]);
  }

  it("問題IDが全て入れ替わったmanual合格を、課題単位で取り消せる", async () => {
    await manual();
    await replaceProblems([
      { id: "q11", title: "架空の新問1" },
      { id: "q12", title: "架空の新問2" },
    ]);
    const response = await manual(undefined, true);
    expect(response.status).toBe(200);
    expect(await db.select().from(taskProblemResults)).toEqual([]);
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(taskProgress)).toEqual([]);
  });

  it("読み取りは現行版に無いmanualの数を返し、現行のmanualやtestsは混ぜない", async () => {
    await manual();
    await replaceProblems([
      { id: "q01-add", title: "架空の残る問" },
      { id: "q11", title: "架空の新問" },
    ]);
    const view = await json<import("@stella/shared/tasks/manual-completion").ManualCompletionView>(
      await request(app(), env, "/api/task-manual-completion?userId=learner&stageId=stage", {
        token: instructorToken,
      }),
    );
    expect(view.units.flatMap((u) => u.tasks).find((t) => t.id === TASK_ID)).toMatchObject({
      obsoleteManualProblems: 1,
    });
    expect(
      view.units.flatMap((u) => u.tasks).find((t) => t.id === plain.input.taskId),
    ).toMatchObject({ obsoleteManualProblems: 0 });
  });

  it("本人が合格した課題でも、現行版に無いmanualだけは課題単位で消せる", async () => {
    await manual(["q01-add"]);
    await submitProblem("q02-sub");
    await replaceProblems([
      { id: "q02-sub", title: "架空の本人の問" },
      { id: "q11", title: "架空の新問" },
    ]);
    const progress = await db.select().from(taskProgress);
    const passes = await db.select().from(submissions);
    const evidence = await db.select().from(skillEvidence);
    const response = await manual(undefined, true);
    expect(response.status).toBe(200);
    expect(await db.select().from(taskProblemResults)).toMatchObject([
      { problemId: "q02-sub", source: "tests" },
    ]);
    expect(await db.select().from(taskProblemResults)).toHaveLength(1);
    expect(await db.select().from(taskProgress)).toEqual(progress);
    expect(await db.select().from(submissions)).toEqual(passes);
    expect(await db.select().from(skillEvidence)).toEqual(evidence);
  });

  it("管理者以外は読み取り・済みにする・取消しがすべて403", async () => {
    expect(
      (
        await request(app(), env, "/api/task-manual-completion?userId=learner&stageId=stage", {
          token,
        })
      ).status,
    ).toBe(403);
    expect((await manual(undefined, false, TASK_ID, token)).status).toBe(403);
    expect((await manual(undefined, true, TASK_ID, token)).status).toBe(403);
  });

  it("理由と対象を検証し、不正な指定では書き込まない", async () => {
    expect((await manual(undefined, false, TASK_ID, instructorToken, "  ")).status).toBe(400);
    expect(
      (await manual(undefined, false, TASK_ID, instructorToken, "a".repeat(1001))).status,
    ).toBe(400);
    expect((await manual(undefined, false, "missing")).status).toBe(400);
    expect((await manual(["missing"])).status).toBe(400);
    expect((await manual(["q01-add"], false, plain.input.taskId)).status).toBe(400);
    await db.update(tasks).set({ variantOf: TASK_ID }).where(eq(tasks.id, plain.input.taskId));
    expect((await manual(undefined, false, plain.input.taskId)).status).toBe(400);
    // 存在しない利用者も、無効な利用者と同じく対象外。
    const missing = await request(app(), env, "/api/task-manual-completion", {
      method: "POST",
      token: instructorToken,
      body: JSON.stringify({
        userId: "missing",
        stageId: "stage",
        items: [{ taskId: TASK_ID }],
        reason: "確認済み",
      }),
    });
    expect(missing.status).toBe(400);
    const invalidItems = await request(app(), env, "/api/task-manual-completion", {
      method: "POST",
      token: instructorToken,
      body: JSON.stringify({
        userId: "learner",
        stageId: "stage",
        items: [{ taskId: TASK_ID }, { taskId: "missing" }],
        reason: "確認済み",
      }),
    });
    expect(invalidItems.status).toBe(400);
    await db.update(profiles).set({ disabled: true }).where(eq(profiles.id, "learner"));
    expect((await manual()).status).toBe(400);
    expect(await db.select().from(taskProblemResults)).toEqual([]);
  });

  it.each([
    [19, 1],
    [105, 2],
  ])(
    "%i課題の読み取りは課題IDのまとまりごとに3種類を取得する",
    async (taskCount, expectedQueries) => {
      const [template] = await db.select().from(tasks).where(eq(tasks.id, TASK_ID));
      for (let index = 2; index < taskCount; index++) {
        await db.insert(tasks).values({ ...template, id: `task-${index}`, order: index });
      }
      await manual(["q01-add"]);
      await submitProblem("q02-sub");
      const prepare = vi.spyOn(database.binding, "prepare");
      try {
        const view = await readManualCompletion(db, "learner", "stage");
        expect(view.units[0].tasks).toHaveLength(taskCount);
        expect(view.units[0].tasks.find((task) => task.id === TASK_ID)).toMatchObject({
          status: "passed",
          reviewSource: "tests",
          problems: [
            { id: "q01-add", source: "manual" },
            { id: "q02-sub", source: "tests" },
          ],
        });
        for (const table of ["task_progress", "submissions", "task_problem_results"]) {
          expect(
            prepare.mock.calls.filter(([sql]) => sql.includes(`from "${table}"`)),
          ).toHaveLength(expectedQueries);
        }
      } finally {
        prepare.mockRestore();
      }
    },
  );

  it("済みに数えない古い版の問題は、いまの版のmanualに置き換えられる", async () => {
    await submitProblem("q01-add", "export const previous = 1;\n");
    await db
      .update(taskProblemResults)
      .set({ contentHash: "old" })
      .where(eq(taskProblemResults.taskId, TASK_ID));
    const before = await readManualCompletion(db, "learner", "stage");
    expect(before.units[0].tasks[0].problems[0].status).toBe("not-submitted");
    expect(await (await manual(["q01-add"])).json()).toEqual({
      inserted: 1,
      skipped: 0,
      passedTaskIds: [],
    });
    expect(await db.select().from(taskProblemResults)).toMatchObject([
      {
        problemId: "q01-add",
        contentHash: CURRENT,
        source: "manual",
        code: "",
        sha256: "",
        path: "src/q01-add.ts",
        manualReason: "別の学習環境で確認済み",
        manualBy: "teacher",
        manualAt: expect.any(Date),
      },
    ]);
    const after = await readManualCompletion(db, "learner", "stage");
    expect(after.units[0].tasks[0].problems[0]).toMatchObject({
      status: "passed",
      source: "manual",
    });
    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "task_manual_complete"));
    expect(audit.metadata).toEqual({
      user_id: "learner",
      stage_id: "stage",
      task_ids: [TASK_ID],
      problem_count: 1,
      reason: "別の学習環境で確認済み",
    });
  });

  it.each([false, true])(
    "ロックが取れないとき、一部保存済みかどうかを案内する（保存済み=%s）",
    async (partial) => {
      await db.insert(resourceLocks).values({
        id: taskSubmissionLockId("learner", partial ? plain.input.taskId : TASK_ID),
        holder: "another-request",
        expiresAt: new Date(Date.now() + 60_000),
      });
      const response = await request(app(), env, "/api/task-manual-completion", {
        method: "POST",
        token: instructorToken,
        body: JSON.stringify({
          userId: "learner",
          stageId: "stage",
          items: [{ taskId: TASK_ID }, { taskId: plain.input.taskId }],
          reason: "別の学習環境で確認済み",
        }),
      });
      expect(response.status).toBe(409);
      expect(await response.text()).toContain(
        partial
          ? "一部は保存済みです。一覧を読み込み直してから、残りをもう一度操作してください"
          : "別の提出・レビューを保存中です。もう一度操作してください",
      );
      expect(await db.select().from(taskProblemResults)).toHaveLength(partial ? 2 : 0);
    },
  );

  it("一部だけ手で済みにすると、コードを返さずstatus passedと出所を返す", async () => {
    const response = await manual(["q01-add"]);
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await response.json()).toEqual({ inserted: 1, skipped: 0, passedTaskIds: [] });
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(taskProblemResults)).toMatchObject([
      {
        source: "manual",
        manualReason: "別の学習環境で確認済み",
        manualBy: "teacher",
        code: "",
        sha256: "",
        path: "src/q01-add.ts",
        contentHash: CURRENT,
      },
    ]);
    const result = await json<{ problems: Record<string, unknown>[] }>(
      await request(app(), env, `/api/tasks/problem-results?taskId=${TASK_ID}`, { token }),
    );
    expect(result.problems).toMatchObject([
      { status: "passed", source: "manual" },
      { status: "not-submitted", source: null },
    ]);
    const admin = await json<{ units: { tasks: { problems: Record<string, unknown>[] }[] }[] }>(
      await request(app(), env, "/api/task-manual-completion?userId=learner&stageId=stage", {
        token: instructorToken,
      }),
    );
    expect(admin.units[0].tasks[0].problems[0]).toMatchObject({
      manualByName: "講師",
      manualReason: "別の学習環境で確認済み",
      manualAt: expect.any(String),
    });
    expect(JSON.stringify(admin)).not.toContain('"code"');
    expect((await manual(["q01-add"])).status).toBe(200);
    expect(await db.select().from(taskProblemResults)).toHaveLength(1);
  });

  it("全問の手動完了は課題に数えるが証拠・AI・レビュー待ちを作らず、ファイルも返さない", async () => {
    const response = await manual();
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await response.json()).toEqual({ inserted: 2, skipped: 0, passedTaskIds: [TASK_ID] });
    const [row] = await db.select().from(submissions);
    expect(row).toMatchObject({
      reviewSource: "manual",
      verdict: "pass",
      reviewerId: "teacher",
      reviewNotes: "別の学習環境で確認済み",
      aiReviewStatus: null,
    });
    expect(await db.select().from(skillEvidence)).toEqual([]);
    expect(await db.select().from(submissionReviews)).toEqual([]);
    expect(await db.select().from(aiReviewJobs)).toEqual([]);
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.get("learner")).toEqual(
      new Set([TASK_ID]),
    );
    expect((await manualCompletionCounts(db, "stage", ["learner"])).get("learner")).toEqual({
      manual_tasks: 1,
      manual_problems: 2,
    });
    expect(await readSubmissionFiles(db, env, row.id)).toEqual([]);
    const listed = await json<{ tasks: Record<string, unknown>[] }>(
      await request(app(), env, "/api/tasks/for-stage/stage", { token }),
    );
    expect(listed.tasks.find((task) => task.id === TASK_ID)).toMatchObject({
      problems_manual: 2,
      manual_passed: true,
      status: "passed",
    });
    const board = await request(app(), env, `/api/review-desk/task-board?taskId=${TASK_ID}`, {
      token: instructorToken,
    });
    expect(board.status, await board.clone().text()).toBe(200);
    expect(await board.json()).toMatchObject({
      submissions: [{ reviewSource: "manual", verdict: "pass" }],
    });
    const gradebook = await request(app(), env, "/api/certificates/gradebook/stage", {
      token: instructorToken,
    });
    expect(gradebook.status, await gradebook.clone().text()).toBe(200);
    const gradebookBody = await json<{ gradebook: { rows: GradebookEntry[] } }>(gradebook);
    expect(gradebookBody).toMatchObject({
      gradebook: {
        rows: [
          {
            manual_tasks: 1,
            manual_problems: 2,
            completion: { passed_assignments: 1 },
          },
        ],
      },
    });
    const completion = gradebookBody.gradebook.rows[0].completion;
    expect(completion).not.toHaveProperty("manual_tasks");
    expect(completion).not.toHaveProperty("manual_problems");
    for (const url of ["/api/certificates/completion/stage", "/api/certificates/completions"]) {
      const learnerCompletion = await request(app(), env, url, { token });
      expect(learnerCompletion.status).toBe(200);
      const body = await json<{ completion?: StageCompletion; completions?: StageCompletion[] }>(
        learnerCompletion,
      );
      const row = body.completion ?? body.completions?.[0];
      expect(row).toMatchObject({ passed_assignments: 1 });
      expect(row).not.toHaveProperty("manual_tasks");
      expect(row).not.toHaveProperty("manual_problems");
    }
    const listedSubmissions = await request(app(), env, "/api/submissions", {
      token: instructorToken,
    });
    expect(listedSubmissions.status).toBe(200);
    expect(await listedSubmissions.json()).toMatchObject({
      rows: [{ review_source: "manual", verdict: "pass" }],
    });
    const staffDetail = await request(app(), env, `/api/submissions/${row.id}`, {
      token: instructorToken,
    });
    expect(await staffDetail.json()).toMatchObject({
      row: { review_source: "manual", review_notes: "別の学習環境で確認済み", stage_id: "stage" },
    });
    const mine = await request(app(), env, "/api/submissions/mine", { token });
    expect(await mine.json()).toMatchObject({
      rows: [{ review_source: "manual", review_notes: "" }],
    });
    const detail = await request(app(), env, `/api/submissions/${row.id}`, { token });
    expect(detail.status, await detail.clone().text()).toBe(200);
    expect(await detail.json()).toMatchObject({
      row: { review_source: "manual", review_notes: "" },
    });
  });

  /** 保存のロックを離したところでテスト確定だけを止め、競合の窓を再現する。 */
  async function pendingProblemCompletion() {
    expect((await manual(["q01-add"])).status).toBe(200);
    const finalize = vi
      .spyOn(taskSubmission, "reviewTaskSubmission")
      .mockImplementationOnce(async () => {
        const [pending] = await db.select().from(submissions);
        return pending;
      });
    try {
      await submitProblem("q02-sub");
      expect(finalize).toHaveBeenCalledTimes(1);
      const [pending] = await db.select().from(submissions);
      expect(pending).toMatchObject({
        verdict: null,
        submissionMode: "submit",
        aiReviewStatus: null,
      });
      return pending.id;
    } finally {
      finalize.mockRestore();
    }
  }

  const learnerCaller = {
    id: "learner",
    role: "student" as const,
    name: "架空の受講者",
    email: null,
  };

  it("最後の問題の保存と確定の間にmanualを取り消しても、合格・証拠・確認待ちを残さない", async () => {
    const pendingId = await pendingProblemCompletion();
    expect((await manual(["q01-add"], true)).status).toBe(200);
    // 取り消し自体で、全問がそろったときの未確定の提出を捨てる。
    expect(await db.select().from(submissions)).toEqual([]);
    await expect(
      reviewTaskSubmission(db, learnerCaller, pendingId, "pass", "", "tests"),
    ).rejects.toMatchObject({ status: 404 });
    expect(await db.select().from(skillEvidence)).toEqual([]);
    expect(await db.select().from(taskProblemResults)).toMatchObject([
      { problemId: "q02-sub", source: "tests" },
    ]);
    expect((await db.select().from(taskProgress))[0]).toMatchObject({
      status: "local-passed",
      passedAt: null,
    });
  });

  it("テスト確定もロック内で問題を数え直し、欠けていれば未確定の提出を捨てる", async () => {
    const pendingId = await pendingProblemCompletion();
    // 古い取り消し処理が先に動いた場合にも、確定側だけで誤合格を防ぐ。
    await db.delete(taskProblemResults).where(eq(taskProblemResults.problemId, "q01-add"));
    await expect(
      reviewTaskSubmission(db, learnerCaller, pendingId, "pass", "", "tests"),
    ).rejects.toMatchObject({ status: 409 });
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(skillEvidence)).toEqual([]);
    expect((await db.select().from(taskProgress))[0]).toMatchObject({
      status: "local-passed",
      passedAt: null,
    });
  });

  it("手で済みの集計は課題ごとに一度だけ定義を読み、問題の問い合わせには全文を載せない", async () => {
    const problems = Array.from({ length: 168 }, (_, index) => ({
      id: `q${index}`,
      title: `架空の問題${index}`,
    }));
    const built = await problemBundle(CURRENT, problems);
    await db
      .update(tasks)
      .set({ definition: JSON.stringify(built.definition), bundle: JSON.stringify(built.bundle) })
      .where(eq(tasks.id, TASK_ID));
    expect((await manual()).status).toBe(200);
    // 合格済みの課題では旧版の現行IDも数える。未合格なら旧版・廃止したIDは数えない。
    await db
      .update(taskProblemResults)
      .set({ contentHash: "old" })
      .where(eq(taskProblemResults.problemId, "q0"));
    const [template] = await db.select().from(taskProblemResults);
    await db.insert(taskProblemResults).values([
      { ...template, userId: "other", problemId: "q0", contentHash: CURRENT },
      { ...template, userId: "other", problemId: "q1", contentHash: "old" },
      { ...template, userId: "other", problemId: "removed", contentHash: CURRENT },
      { ...template, userId: "learner", problemId: "removed", contentHash: CURRENT },
    ]);
    const parse = vi.spyOn(problemSubmission, "readTaskDefinition");
    const prepare = vi.spyOn(database.binding, "prepare");
    try {
      // 利用者を分割しても同じ定義を解析し直さない。
      const counts = await manualCompletionCounts(db, "stage", [
        "learner",
        "other",
        ...Array.from({ length: 50 }, (_, i) => `sample-${i}`),
      ]);
      expect(counts.get("learner")).toEqual({ manual_tasks: 1, manual_problems: 168 });
      expect(counts.get("other")).toEqual({ manual_tasks: 0, manual_problems: 1 });
      expect(parse).toHaveBeenCalledTimes(2); // 問題つき1課題と、問題なし1課題。
      const problemQueries = prepare.mock.calls
        .map(([query]) => query)
        .filter((query) => query.includes('from "task_problem_results"'));
      expect(problemQueries.length).toBeGreaterThan(0);
      expect(problemQueries.every((query) => !query.includes('"definition"'))).toBe(true);
    } finally {
      parse.mockRestore();
      prepare.mockRestore();
    }
  });

  it("残りを本人が解けばtestsで合格し、問題ごとの出所は残る。tests合格内のmanualは取消せない", async () => {
    await manual(["q01-add"]);
    expect(await submitProblem("q02-sub")).toMatchObject({ taskPassed: true });
    const [row] = await db.select().from(submissions);
    expect(row.reviewSource).toBe("tests");
    expect(await db.select().from(taskProblemResults)).toMatchObject([
      { source: "manual" },
      { source: "tests" },
    ]);
    expect(await db.select().from(skillEvidence)).toHaveLength(1);
    const files = await readSubmissionFiles(db, env, row.id);
    expect(files.map((file) => file.path)).toEqual(["src/q02-sub.ts"]);
    const response = await manual(["q01-add"], true);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      deleted: 0,
      blocked: [{ taskId: TASK_ID, reason: expect.stringContaining("本人の提出") }],
    });
    expect(await db.select().from(taskProblemResults)).toHaveLength(2);
  });

  it("手で済みの問題を本人が解くとtestsになり、管理者はテスト済みのコードを上書きできない", async () => {
    await manual(["q01-add"]);
    await submitProblem("q01-add", "export const mine = 7;\n");
    const [row] = await db.select().from(taskProblemResults);
    expect(row).toMatchObject({
      source: "tests",
      manualReason: null,
      manualBy: null,
      manualAt: null,
      code: "export const mine = 7;\n",
    });
    expect(row.sha256).not.toBe("");
    expect(await (await manual(["q01-add"])).json()).toMatchObject({ inserted: 0, skipped: 1 });
    expect((await db.select().from(taskProblemResults))[0]).toEqual(row);
  });

  it("取消しはmanualだけを消し、manual合格と合格日を戻す", async () => {
    await submitProblem("q01-add");
    await manual(["q02-sub"]);
    expect((await db.select().from(taskProgress))[0]).toMatchObject({
      status: "passed",
      passedAt: expect.any(Date),
    });
    // 問題を明示した取り消しは、テスト済みを blocked として返す。
    const response = await manual(["q01-add", "q02-sub"], true);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      deleted: 1,
      blocked: [{ problemId: "q01-add" }],
    });
    expect(await db.select().from(taskProblemResults)).toMatchObject([
      { problemId: "q01-add", source: "tests" },
    ]);
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(taskProgress)).toMatchObject([
      {
        taskId: TASK_ID,
        userId: "learner",
        status: "local-passed",
        contentHash: CURRENT,
        passedAt: null,
      },
    ]);
  });

  it("問題のない課題も済みにして取り消せる。受講開始前でも進捗を保存できる", async () => {
    await db.delete(enrollments);
    const response = await manual(undefined, false, plain.input.taskId);
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await response.json()).toMatchObject({
      inserted: 1,
      passedTaskIds: [plain.input.taskId],
    });
    expect((await manual(undefined, false, plain.input.taskId)).status).toBe(200);
    expect(await db.select().from(submissions)).toHaveLength(1);
    await db.insert(enrollments).values({ userId: "learner", stageId: "stage", status: "active" });
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.get("learner")).toEqual(
      new Set([plain.input.taskId]),
    );
    expect((await manual(undefined, true, plain.input.taskId)).status).toBe(200);
    expect(await db.select().from(submissions)).toEqual([]);
    expect(await db.select().from(taskProgress)).toEqual([]);
  });

  it("1300問を100バインド以内の文で保存・取消しし、監査に問題IDを列挙しない", async () => {
    const problems = Array.from({ length: 1300 }, (_, index) => ({
      id: `q${index}`,
      title: `問題${index}`,
    }));
    const built = await problemBundle(CURRENT, problems);
    await db
      .update(tasks)
      .set({ definition: JSON.stringify(built.definition), bundle: JSON.stringify(built.bundle) })
      .where(eq(tasks.id, TASK_ID));
    const response = await manual();
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await response.json()).toMatchObject({ inserted: 1300, passedTaskIds: [TASK_ID] });
    expect(await db.select().from(taskProblemResults)).toHaveLength(1300);
    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "task_manual_complete"));
    expect(audit.metadata).toMatchObject({
      user_id: "learner",
      stage_id: "stage",
      task_ids: [TASK_ID],
      problem_count: 1300,
      reason: "別の学習環境で確認済み",
    });
    expect(JSON.stringify(audit.metadata)).not.toContain("q1299");
    expect(await (await manual(undefined, true)).json()).toEqual({ deleted: 1300, blocked: [] });
    expect(await db.select().from(taskProblemResults)).toEqual([]);
    expect(await db.select().from(taskProgress)).toEqual([]);
    expect(
      await db.select().from(auditLogs).where(eq(auditLogs.action, "task_manual_revoke")),
    ).toHaveLength(1);
  });

  it("ステージ完了と自動修了証を、手で済みの取消しで戻す", async () => {
    await db
      .insert(lessons)
      .values({ id: "lesson", sectionId: "unit", title: "課題文", type: "text" });
    await db
      .update(stages)
      .set({
        requireAllLessons: false,
        requireQuizPass: false,
        requireAssignmentPass: true,
        autoIssueCertificate: true,
      })
      .where(eq(stages.id, "stage"));
    await manual(undefined, false, plain.input.taskId);
    await manual();
    expect((await db.select().from(enrollments))[0].status).toBe("completed");
    expect(await db.select().from(certificates)).toHaveLength(1);
    expect((await manual(["q01-add"], true)).status).toBe(200);
    expect((await db.select().from(enrollments))[0].status).toBe("active");
    expect(await db.select().from(certificates)).toEqual([]);
  });

  it("学習ペースの進捗には含め、日ごとの活動と週の合格件数には含めない", async () => {
    await db
      .insert(contentUnits)
      .values({ sectionId: "unit", plannedHours: 1, skills: { uses: [], assesses: [] } });
    await db.update(stages).set({ slug: "dev-env-basics" }).where(eq(stages.id, "stage"));
    await manual();
    const learner = { id: "learner", role: "student" as const, name: "架空の受講者", email: null };
    const pace = await loadLearningPace(db, learner, "2026-11-16");
    expect(pace.completedMinutes).toBe(20);
    await db.update(tasks).set({ kind: "assessment-a" }).where(eq(tasks.id, TASK_ID));
    await db
      .update(tasks)
      .set({ kind: "assessment-b", pattern: "calc" })
      .where(eq(tasks.id, plain.input.taskId));
    const importedAssessment = await loadLearningPace(db, learner, "2026-11-16");
    expect(importedAssessment.assessments).toEqual([]);
    const [row] = await db.select().from(submissions);
    // 週内の合格・提出として置いた手動行も、その日の取り組みとしては数えない。
    const at = new Date("2026-11-10T03:00:00Z");
    await db
      .update(submissions)
      .set({ submittedAt: at, reviewedAt: at })
      .where(eq(submissions.id, row.id));
    await db.update(taskProgress).set({ passedAt: at }).where(eq(taskProgress.taskId, TASK_ID));
    const material = await collectMemoMaterial(
      db,
      learner,
      "2026-11-09",
      new Date("2026-11-16T03:00:00Z"),
    );
    expect(material.activity.activeDays).toBe(0);
    expect(material.activity.submissions).toBe(0);
    expect(material.passedTaskCount).toBe(0);
  });

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
      { id: "teacher", role: "admin", name: "講師", email: null },
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
      error: "教材が更新されています。Web の課題文から「VS Code で開く」を押してください",
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
        source: "tests",
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

  it("問題の相談は合格にできず、再提出で返信したあと全問の提出で合格にする", async () => {
    const consult = await problemInput(CURRENT, PROBLEMS, "q01-add");
    consult.mode = "consult";
    consult.explanation = "足し算のテストが通りません";
    consult.localResult.outcome = "failed";
    consult.localResult.steps = consult.localResult.steps.map((step) =>
      step.id === "test" ? { ...step, status: "failed" } : step,
    );
    const consulted = await post(consult);
    expect(consulted.status, await consulted.clone().text()).toBe(201);
    const { row } = await json<{ row: { id: string } }>(consulted);

    const rejected = await request(app(), env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({ verdict: "pass" }),
    });
    expect(rejected.status, await rejected.clone().text()).toBe(409);
    expect(await rejected.json()).toMatchObject({
      error: "問題つきの課題の相談は合格にできません。返信は再提出で送ってください",
    });
    expect(await db.select().from(submissions).where(eq(submissions.id, row.id))).toMatchObject([
      {
        submissionMode: "consult",
        localResult: { problemId: "q01-add" },
        verdict: null,
      },
    ]);
    expect((await db.select().from(taskProgress))[0]?.status).not.toBe("passed");
    expect(await db.select().from(skillEvidence)).toEqual([]);

    const replied = await request(app(), env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({
        verdict: "resubmit",
        reviewNotes: "足し算の結果を確認して、もう一度提出してください。",
      }),
    });
    expect(replied.status, await replied.clone().text()).toBe(200);
    expect(await db.select().from(submissions).where(eq(submissions.id, row.id))).toMatchObject([
      { verdict: "resubmit" },
    ]);

    expect(await submitProblem("q01-add")).toMatchObject({ taskPassed: false });
    expect(await submitProblem("q02-sub")).toMatchObject({
      passedProblems: PROBLEMS.length,
      taskPassed: true,
    });
    expect((await db.select().from(taskProgress))[0]?.status).toBe("passed");
    expect(
      await db.select().from(submissions).where(eq(submissions.reviewSource, "tests")),
    ).toMatchObject([{ taskId: TASK_ID, taskContentHash: CURRENT, verdict: "pass" }]);
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
