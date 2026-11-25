import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  TASK_BUNDLE_LIMITS,
  type TaskBundle,
  type TaskBundleResponse,
  type TaskSummary,
} from "@stella/shared/tasks/catalog";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { starterCodeHash } from "@stella/shared/tasks/starter-code";
import { getDb } from "../db/client.js";
import {
  enrollments,
  profiles,
  sections,
  stages,
  submissions,
  taskFixedStarts,
  taskFixedStartUses,
  taskPrivate,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { hasRecordedSupport } from "../lib/task-support.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { submissionsRoute } from "./submissions.js";
import { tasksRoute } from "./tasks.js";

const PRIVATE_MARKER = "PRIVATE_SOLUTION_MARKER_31";
/** 前の課題。後の課題 (fixture) の固定した開始点が、この課題の動く実装を含む。 */
const EARLIER_ID = "dev-env-basics/u01/earlier";
const DEFINITION = {
  submit: { explanation: false, debuggingRecord: false },
  skills: { assesses: ["html"] },
};
const encode = (text: string) => Buffer.from(text).toString("base64");

describe("課題の配布 API (実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  let token: string;
  let otherToken: string;
  let fixedStartFiles: Record<string, string>;
  beforeEach(async () => {
    database = sqliteD1();
    env = {
      DB: database.binding,
      AUTH_JWT_SECRET: "test-secret",
      SUBMISSIONS_BUCKET: {
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => undefined),
      },
    } as unknown as Env;
    db = getDb(env);
    fixture = await submissionFixture();
    fixedStartFiles = {
      ...fixture.bundle.files,
      "index.html": encode("<!doctype html><html><body>前の課題まで動く状態</body></html>\n"),
      "lib/validate.js": encode("export const validate = () => true;\n"),
    };
    await db.batch([
      db.insert(tenants).values([{ id: "ses", name: "テスト" }]),
      db.insert(profiles).values([
        { id: "learner", displayName: "受講者", role: "student" },
        { id: "outsider", displayName: "未受講の受講者", role: "student" },
      ]),
      db.insert(stages).values({
        id: "stage",
        slug: "dev-env-basics",
        title: "開発環境",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "入口" }),
      db.insert(enrollments).values({ userId: "learner", stageId: "stage", status: "active" }),
      db.insert(tasks).values({
        id: fixture.input.taskId,
        sectionId: "unit",
        title: "課題",
        kind: "basic",
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: fixture.bundle.contentHash,
        definition: JSON.stringify({
          submit: { explanation: false, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
        definition: JSON.stringify({
          submit: { explanation: false, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskPrivate).values({
        taskId: fixture.input.taskId,
        files: JSON.stringify({
          "solution/index.html": encode(PRIVATE_MARKER),
          "explanation.md": encode(PRIVATE_MARKER),
          "review.md": encode(PRIVATE_MARKER),
          "variants/a/index.html": encode(PRIVATE_MARKER),
        }),
      }),
    ]);
    token = await signAccessToken("test-secret", "learner", "learner@example.com");
    otherToken = await signAccessToken("test-secret", "outsider", "outsider@example.com");
  });
  afterEach(() => database.sqlite.close());

  const app = () => mountTestApp(env, tasksRoute, submissionsRoute).app;
  const bundleOf = (as = token, extension?: string) =>
    request(
      app(),
      env,
      `/api/tasks/bundle?${new URLSearchParams({
        taskId: fixture.input.taskId,
        ...(extension === undefined ? {} : { extension }),
      })}`,
      {
        token: as,
      },
    );
  const revisionFiles = (
    contentHash = fixture.bundle.contentHash,
    as = token,
    extension?: string,
  ) =>
    request(
      app(),
      env,
      `/api/tasks/revision-files?${new URLSearchParams({
        taskId: fixture.input.taskId,
        contentHash,
        ...(extension === undefined ? {} : { extension }),
      })}`,
      { token: as },
    );
  const useTypeScriptBundle = async (withProblems = false, withReadme = true) => {
    const { bundle } = await submissionFixture({
      runner: "ts-test",
      submit: { files: ["src/**/*.ts"] },
      protected: [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "eslint.config.js",
        "vitest.config.js",
        "tests/**",
      ],
      checks: { lint: true, format: false },
      ...(withProblems ? { problems: [{ id: "q01", title: "値を返す" }] } : {}),
    });
    if (!withReadme) delete bundle.files["README.md"];
    await db
      .update(tasks)
      .set({ bundle: JSON.stringify(bundle) })
      .where(eq(tasks.id, fixture.input.taskId));
    return bundle;
  };
  const fixedStart = (as = token, taskId = fixture.input.taskId, extension?: string) =>
    request(
      app(),
      env,
      extension === undefined
        ? "/api/tasks/fixed-start"
        : `/api/tasks/fixed-start?${new URLSearchParams({ extension })}`,
      {
        method: "POST",
        token: as,
        body: JSON.stringify({ taskId }),
      },
    );
  const addFixedStart = (contentHash = fixture.bundle.contentHash) =>
    db.insert(taskFixedStarts).values({
      taskId: fixture.input.taskId,
      contentHash,
      files: JSON.stringify(fixedStartFiles),
    });
  /** 後の課題 (fixture) の開始点が、前の課題の実装を含むと教材に書いた版にする。 */
  const coverEarlierTask = () =>
    db
      .update(tasks)
      .set({ definition: JSON.stringify({ ...DEFINITION, fixedStart: { covers: [EARLIER_ID] } }) })
      .where(eq(tasks.id, fixture.input.taskId));
  const addEarlierTask = async (kind: TaskKind = "basic") => {
    const earlier = await submissionFixture({ id: EARLIER_ID, title: "前の課題", kind });
    const definition = JSON.stringify(DEFINITION);
    await db.batch([
      db.insert(tasks).values({
        id: EARLIER_ID,
        sectionId: "unit",
        title: "前の課題",
        kind,
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: earlier.bundle.contentHash,
        definition,
        bundle: JSON.stringify(earlier.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: EARLIER_ID,
        contentHash: earlier.bundle.contentHash,
        definition,
        bundle: JSON.stringify(earlier.bundle),
      }),
    ]);
    return earlier;
  };
  const submit = (input: { taskId: string }) =>
    request(app(), env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({ ...input, support: [] }),
    });
  const submittedOf = (taskId: string) =>
    db
      .select()
      .from(submissions)
      .where(eq(submissions.taskId, taskId))
      .orderBy(submissions.attempt);
  const decoded = (bundle: TaskBundle) =>
    Object.values(bundle.files)
      .map((value) => Buffer.from(value, "base64").toString())
      .join("\n");

  it("配布は公開ファイルだけで、private/ の素材を返さない", async () => {
    const response = await bundleOf();
    expect(response.status, await response.clone().text()).toBe(200);
    const body = await json<TaskBundleResponse>(response);
    expect(Object.keys(body.bundle.files).sort()).toEqual(
      [".stella/task.json", "README.md", "index.html", "tests/config.json"].sort(),
    );
    expect(body.fixedStart).toBe(false);
    expect(JSON.stringify(body)).not.toContain(PRIVATE_MARKER);
    expect(JSON.stringify(body)).not.toContain(encode(PRIVATE_MARKER));
  });

  it("指定した過去のバージョンから公開ファイルのハッシュだけを返す", async () => {
    const legacyHash = "b".repeat(64);
    const legacyFiles = { ...fixture.bundle.files, "README.md": encode("\ufeff過去の課題文\r\n") };
    await db.insert(taskRevisions).values({
      taskId: fixture.input.taskId,
      contentHash: legacyHash,
      definition: JSON.stringify(fixture.bundle.manifest),
      bundle: JSON.stringify({ ...fixture.bundle, contentHash: legacyHash, files: legacyFiles }),
    });
    const response = await revisionFiles(legacyHash);
    expect(response.status, await response.clone().text()).toBe(200);
    const body = await json<{ files: Record<string, string>; codeHashes: Record<string, string> }>(
      response,
    );
    expect(Object.keys(body)).toEqual(["files", "codeHashes"]);
    expect(Object.keys(body.files).sort()).toEqual(Object.keys(fixture.bundle.files).sort());
    const index = Uint8Array.from(atob(fixture.bundle.files["index.html"]), (ch) =>
      ch.charCodeAt(0),
    );
    expect(body.codeHashes["index.html"]).toBe(await starterCodeHash(index));
    expect(body.codeHashes).not.toHaveProperty("tests/config.json");
    expect(body.files["README.md"]).toBe(
      createHash("sha256").update("過去の課題文\n").digest("hex"),
    );
    expect(JSON.stringify(body)).not.toMatch(/private|hints.md|PRIVATE/);
  });

  it("参照できない課題と存在しないバージョンのハッシュ一覧は 404", async () => {
    expect((await revisionFiles(fixture.bundle.contentHash, otherToken)).status).toBe(404);
    expect((await revisionFiles("f".repeat(64))).status).toBe(404);
  });

  it("ハッシュ一覧は指定された履歴に README がなければ 0.12.0 を要求する", async () => {
    const current = await useTypeScriptBundle(true);
    const contentHash = "b".repeat(64);
    const { "README.md": _readme, ...files } = current.files;
    await db.insert(taskRevisions).values({
      taskId: fixture.input.taskId,
      contentHash,
      definition: JSON.stringify(current.manifest),
      bundle: JSON.stringify({ ...current, contentHash, files }),
    });
    const outdated = await revisionFiles(contentHash, token, "0.11.2");
    expect(outdated.status).toBe(426);
    expect(await outdated.json()).toEqual({ error: expect.stringContaining("0.12.0") });
    const supported = await revisionFiles(contentHash, token, "0.12.0");
    expect(supported.status).toBe(200);
    expect(Object.keys((await json<{ files: Record<string, string> }>(supported)).files)).toEqual(
      Object.keys(files),
    );
    expect((await revisionFiles()).status).toBe(200);
  });

  it.each(["private/solution/index.html", "hints.md"])(
    "履歴に %s が混ざっていたらハッシュも返さない",
    async (rel) => {
      await db
        .update(taskRevisions)
        .set({
          bundle: JSON.stringify({
            ...fixture.bundle,
            files: { ...fixture.bundle.files, [rel]: encode(PRIVATE_MARKER) },
          }),
        })
        .where(eq(taskRevisions.taskId, fixture.input.taskId));
      const response = await revisionFiles();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(await response.text()).not.toContain(rel);
    },
  );

  it("ts-test の課題は版の申告がない拡張に更新を案内する", async () => {
    await useTypeScriptBundle();
    const response = await bundleOf();
    expect(response.status).toBe(426);
    const body = await json<{ error: string }>(response);
    expect(body.error).toContain("0.6.0");
    expect(body.error).toContain("更新してください");
    expect(body.error).toContain("拡張機能ビュー");
    expect(body.error).toContain("VS Code で開く");
    expect(Object.keys(body)).toEqual(["error"]);
  });

  it("問題つきの課題は 0.7.0 の拡張に 0.8.0 以上への更新を案内する", async () => {
    await useTypeScriptBundle(true);
    const response = await bundleOf(token, "0.7.0");
    expect(response.status).toBe(426);
    expect(await json<{ error: string }>(response)).toEqual({
      error: expect.stringContaining("バージョン 0.8.0 以上に更新してください"),
    });
  });

  it.each([false, true])(
    "0.8.2 の拡張には ts-test の課題を配る (問題つき: %s)",
    async (problems) => {
      const bundle = await useTypeScriptBundle(problems);
      const response = await bundleOf(token, "0.8.2");
      expect(response.status, await response.clone().text()).toBe(200);
      expect(await json<TaskBundleResponse>(response)).toEqual({ bundle, fixedStart: false });
    },
  );

  it("版の要件がない課題は申告なしの拡張にも配る", async () => {
    const response = await bundleOf();
    expect(response.status, await response.clone().text()).toBe(200);
    expect(await json<TaskBundleResponse>(response)).toEqual({
      bundle: fixture.bundle,
      fixedStart: false,
    });
  });

  it("README のない問題つきの通常配布物には 0.12.0 を要求する", async () => {
    const bundle = await useTypeScriptBundle(true, false);
    const outdated = await bundleOf(token, "0.11.2");
    expect(outdated.status).toBe(426);
    expect(await outdated.json()).toEqual({ error: expect.stringContaining("0.12.0") });
    const supported = await bundleOf(token, "0.12.0");
    expect(supported.status).toBe(200);
    expect(await json<TaskBundleResponse>(supported)).toEqual({ bundle, fixedStart: false });
  });

  it("版の要件がある課題もアクセスできない受講者には 404 を返す", async () => {
    await useTypeScriptBundle();
    const response = await bundleOf(otherToken);
    expect(response.status).toBe(404);
    expect(await json<{ error: string }>(response)).toEqual({ error: "task not found" });
  });

  it("課題一覧は課題文のレッスンを返し、定義・配布物・private/ を返さない", async () => {
    await db
      .update(tasks)
      .set({ lessonId: "task-readme" })
      .where(eq(tasks.id, fixture.input.taskId));
    const response = await request(app(), env, "/api/tasks/for-stage/stage", { token });
    expect(response.status, await response.clone().text()).toBe(200);
    const body = await json<{ tasks: TaskSummary[] }>(response);
    expect(body.tasks).toMatchObject([{ id: fixture.input.taskId, lessonId: "task-readme" }]);
    expect(JSON.stringify(body)).not.toMatch(/bundle|definition|PRIVATE|files/);
  });

  it("bundle に private/ が紛れ込んでいても配らない", async () => {
    await db
      .update(tasks)
      .set({
        bundle: JSON.stringify({
          ...fixture.bundle,
          files: { ...fixture.bundle.files, "private/solution/index.html": encode(PRIVATE_MARKER) },
        }),
      })
      .where(eq(tasks.id, fixture.input.taskId));
    const response = await bundleOf();
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).not.toContain(encode(PRIVATE_MARKER));
  });

  it("受講していない受講者には課題も開始点も 404", async () => {
    await addFixedStart();
    expect((await bundleOf(otherToken)).status).toBe(404);
    expect((await fixedStart(otherToken)).status).toBe(404);
    expect(await db.select().from(taskFixedStartUses)).toEqual([]);
  });

  it("固定した開始点は求めたときだけ渡し、使ったことを記録する", async () => {
    await addFixedStart();
    expect((await json<TaskBundleResponse>(await bundleOf())).fixedStart).toBe(true);
    const response = await fixedStart();
    expect(response.status, await response.clone().text()).toBe(200);
    const { bundle } = await json<{ bundle: TaskBundle }>(response);
    expect(bundle.manifest.id).toBe(fixture.input.taskId);
    expect(bundle.contentHash).toBe(fixture.bundle.contentHash);
    expect(Buffer.from(bundle.files["lib/validate.js"], "base64").toString()).toContain("validate");
    expect(decoded(bundle)).not.toContain(PRIVATE_MARKER);
    // 受け取り直しても記録は版ごとに 1 件。
    expect((await fixedStart()).status).toBe(200);
    const uses = await db.select().from(taskFixedStartUses);
    expect(uses).toMatchObject([
      {
        userId: "learner",
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
      },
    ]);
  });

  it("開始点が無い・版が古い課題では渡さず、記録もしない", async () => {
    expect((await fixedStart()).status).toBe(404);
    await addFixedStart("b".repeat(64));
    expect((await json<TaskBundleResponse>(await bundleOf())).fixedStart).toBe(false);
    expect((await fixedStart()).status).toBe(404);
    expect(await db.select().from(taskFixedStartUses)).toEqual([]);
  });

  it("上限を超えた開始点は配らず、利用も記録しない", async () => {
    fixedStartFiles["vendor.js"] = Buffer.alloc(TASK_BUNDLE_LIMITS.fileBytes + 1, 1).toString(
      "base64",
    );
    await addFixedStart();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await fixedStart()).status).toBe(500);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
    expect(await db.select().from(taskFixedStartUses)).toEqual([]);
  });

  it("README のない固定した開始点は 0.12.0 を要求し、配れなければ利用を記録しない", async () => {
    await useTypeScriptBundle(true);
    delete fixedStartFiles["README.md"];
    await addFixedStart();
    const outdated = await fixedStart(token, fixture.input.taskId, "0.11.2");
    expect(outdated.status).toBe(426);
    expect(await outdated.json()).toEqual({ error: expect.stringContaining("0.12.0") });
    expect(await db.select().from(taskFixedStartUses)).toEqual([]);
    const supported = await fixedStart(token, fixture.input.taskId, "0.12.0");
    expect(supported.status).toBe(200);
    expect((await json<TaskBundleResponse>(supported)).bundle.files).toEqual(fixedStartFiles);
    expect(await db.select().from(taskFixedStartUses)).toHaveLength(1);
  });

  it("通常配布物に README がなくても、README つきの固定した開始点は申告なしで配る", async () => {
    await useTypeScriptBundle(true, false);
    await addFixedStart();
    expect((await fixedStart()).status).toBe(200);
  });

  it("受講を終えた受講者には開始点を渡さない (課題は読める)", async () => {
    await addFixedStart();
    await db
      .update(enrollments)
      .set({ status: "completed" })
      .where(eq(enrollments.userId, "learner"));
    expect((await bundleOf()).status).toBe(200);
    expect((await fixedStart()).status).toBe(404);
  });

  it("開始点を受け取った受講者の提出は、手元の記録が無くても支援付きになる", async () => {
    await addFixedStart();
    await coverEarlierTask();
    expect((await fixedStart()).status).toBe(200);
    const response = await submit(fixture.input);
    expect(response.status, await response.clone().text()).toBe(201);
    const [row] = await db.select().from(submissions);
    expect(row.supportLog).toEqual([
      expect.objectContaining({
        kind: "fixed-start",
        detail: "固定した開始点を受け取った記録 (LMS)",
      }),
    ]);
  });

  it("開始点を受け取るとき、開始点が実装を含む前の課題もその時点の教材から記録する", async () => {
    await addFixedStart();
    await coverEarlierTask();
    expect((await fixedStart()).status).toBe(200);
    expect(await db.select().from(taskFixedStartUses)).toMatchObject([
      { taskId: fixture.input.taskId, coveredTaskIds: [EARLIER_ID] },
    ]);
  });

  it("後の課題の開始点を受け取ったあとの前の課題の提出は支援付きになり、前の提出は変えない", async () => {
    const earlier = await addEarlierTask();
    await addFixedStart();
    await coverEarlierTask();
    expect((await submit(earlier.input)).status).toBe(201);
    expect((await fixedStart()).status).toBe(200);
    const response = await submit(earlier.input);
    expect(response.status, await response.clone().text()).toBe(201);
    const [before, after] = await submittedOf(EARLIER_ID);
    expect(before.supportLog).toEqual([]);
    expect(after.supportLog).toEqual([
      expect.objectContaining({
        kind: "fixed-start",
        detail: "後の課題「課題」の固定した開始点を受け取った記録 (LMS)",
      }),
    ]);
  });

  it("前の課題を含まない開始点 (含む課題を記録していない受け取り) では前の課題を変えない", async () => {
    const earlier = await addEarlierTask();
    await addFixedStart();
    expect((await fixedStart()).status).toBe(200);
    expect(await db.select().from(taskFixedStartUses)).toMatchObject([{ coveredTaskIds: null }]);
    expect((await submit(earlier.input)).status).toBe(201);
    const [row] = await submittedOf(EARLIER_ID);
    expect(row.supportLog).toEqual([]);
  });

  it("前の課題が確認A・Bなら、後の課題の開始点を受け取ったあとの提出は AI で確定せず人に回す", async () => {
    const earlier = await addEarlierTask("assessment-a");
    await addFixedStart();
    await coverEarlierTask();
    expect((await fixedStart()).status).toBe(200);
    const response = await submit(earlier.input);
    expect(response.status, await response.clone().text()).toBe(201);
    const [row] = await submittedOf(EARLIER_ID);
    expect(row.aiReviewStatus).toBe("escalated");
    const [progress] = await db
      .select({ status: taskProgress.status })
      .from(taskProgress)
      .where(eq(taskProgress.taskId, EARLIER_ID));
    expect(progress?.status).toBe("instructor-pending");
  });

  it("提出の処理中に受け取った開始点も、受け取りが提出の時刻より前なら支援に数える", async () => {
    const earlier = await addEarlierTask("assessment-a");
    await addFixedStart();
    await coverEarlierTask();
    expect((await submit(earlier.input)).status).toBe(201);
    const [row] = await submittedOf(EARLIER_ID);
    const scope = {
      studentId: row.studentId ?? "",
      taskId: EARLIER_ID,
      submittedAt: row.submittedAt,
    };
    expect(await hasRecordedSupport(db, scope)).toBe(false);
    // 提出の読み出しより後に記録が届いたが、受け取りの時刻は提出より前 (読み漏れ)。AI の判定の
    // 直前とスキルの証拠を作るときに `hasRecordedSupport` が拾う。
    await db.insert(taskFixedStartUses).values({
      userId: scope.studentId,
      taskId: fixture.input.taskId,
      contentHash: fixture.bundle.contentHash,
      usedAt: new Date(row.submittedAt.getTime() - 1),
      coveredTaskIds: [EARLIER_ID],
    });
    expect(await hasRecordedSupport(db, scope)).toBe(true);
    // 提出より後の受け取りは、その提出の支援に数えない。
    expect(
      await hasRecordedSupport(db, {
        ...scope,
        submittedAt: new Date(row.submittedAt.getTime() - 2),
      }),
    ).toBe(false);
  });

  it("開始点を使っていない提出の支援記録は変えない", async () => {
    await addFixedStart();
    const response = await request(app(), env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({ ...fixture.input, support: [] }),
    });
    expect(response.status, await response.clone().text()).toBe(201);
    const [row] = await db.select().from(submissions);
    expect(row.supportLog).toEqual([]);
  });
});
