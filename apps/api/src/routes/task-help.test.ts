import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { TaskHelpResponse } from "@stella/shared/tasks/help";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import type { TaskSupportRecord } from "@stella/shared/tasks/support-record";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { getDb } from "../db/client.js";
import {
  enrollments,
  profiles,
  sections,
  stages,
  submissions,
  taskHelpOpens,
  taskLocalRuns,
  taskPrivate,
  taskPrivateVersions,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { hasRecordedSupport } from "../lib/task-support.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { submissionsRoute } from "./submissions.js";
import { taskSupportRoute } from "./task-support.js";
import { tasksRoute } from "./tasks.js";

/** 素材ごとの目印。応答にどれが混ざったかを本文で確かめる。 */
const MARK = {
  hint1: "HINT_ONE_POLICY_36",
  hint1Title: "HINT_ONE_TITLE_36",
  hint2: "HINT_TWO_CODE_36",
  hint2Title: "HINT_TWO_TITLE_36",
  solution: "SOLUTION_MARKER_36",
  explanation: "EXPLANATION_MARKER_36",
  review: "REVIEW_GUIDE_MARKER_36",
  variant: "VARIANT_MARKER_36",
} as const;
const encode = (text: string) => Buffer.from(text).toString("base64");
const PRIVATE_FILES = {
  "hints.md": encode(
    `## ヒント1 ${MARK.hint1Title}\n${MARK.hint1}\n\n## ヒント2 ${MARK.hint2Title}\n${MARK.hint2}\n`,
  ),
  "solution/index.html": encode(`<h1>${MARK.solution}</h1>`),
  "explanation.md": encode(`# 解説\n${MARK.explanation}`),
  "review.md": encode(MARK.review),
  "variants/a/index.html": encode(MARK.variant),
  "variants/a/solution/index.html": encode(MARK.variant),
};
function isFor(encoded: string, mark: string): boolean {
  return Buffer.from(encoded, "base64").toString().includes(mark);
}
/** 目印 (本文そのものか、素材の base64) が応答に入っていれば、その目印を返す。 */
function leaked(body: unknown, ...marks: string[]): string[] {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return marks.filter(
    (mark) =>
      text.includes(mark) ||
      Object.values(PRIVATE_FILES).some(
        (encoded) => isFor(encoded, mark) && text.includes(encoded),
      ),
  );
}

describe("ヒント・解答例・解説の解放 API (実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  let token: string;
  let otherToken: string;
  let strangerToken: string;

  async function setup(kind: TaskKind, support: Record<string, unknown>) {
    fixture = await submissionFixture({ kind });
    const definition = JSON.stringify({
      submit: { explanation: false, debuggingRecord: false },
      skills: { assesses: ["html"] },
      support,
    });
    await db.batch([
      db.insert(tasks).values({
        id: fixture.input.taskId,
        sectionId: "unit",
        title: "課題",
        kind,
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: fixture.bundle.contentHash,
        definition,
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
        definition,
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskPrivate).values({
        taskId: fixture.input.taskId,
        files: JSON.stringify(PRIVATE_FILES),
      }),
    ]);
  }

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
    await db.batch([
      db.insert(tenants).values([
        { id: "ses", name: "テスト" },
        { id: "other", name: "他社" },
      ]),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
        { id: "stranger", tenantId: "ses", displayName: "未受講の受講者", role: "student" },
        { id: "outsider", tenantId: "other", displayName: "他社の受講者", role: "student" },
      ]),
      db.insert(stages).values({
        id: "stage",
        tenantId: "ses",
        slug: "dev-env-basics",
        title: "開発環境",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "入口" }),
      db
        .insert(enrollments)
        .values({ tenantId: "ses", userId: "learner", stageId: "stage", status: "active" }),
    ]);
    token = await signAccessToken("test-secret", "learner", "learner@example.com");
    otherToken = await signAccessToken("test-secret", "outsider", "outsider@example.com");
    strangerToken = await signAccessToken("test-secret", "stranger", "stranger@example.com");
  });
  afterEach(() => database.sqlite.close());

  const app = () => mountTestApp(env, tasksRoute, submissionsRoute, taskSupportRoute).app;
  const help = (as = token) =>
    request(
      app(),
      env,
      `/api/tasks/help?${new URLSearchParams({ taskId: fixture.input.taskId })}`,
      {
        token: as,
      },
    );
  const open = (item: string, level?: number, as = token) =>
    request(app(), env, "/api/tasks/help/open", {
      method: "POST",
      token: as,
      body: JSON.stringify({ taskId: fixture.input.taskId, item, level }),
    });
  /** 受講者の手元の版 (配布記録の contentHash) を付けた呼び出し。 */
  const helpAt = (contentHash: string) =>
    request(
      app(),
      env,
      `/api/tasks/help?${new URLSearchParams({ taskId: fixture.input.taskId, contentHash })}`,
      { token },
    );
  const openAt = (contentHash: string, item: string, level?: number) =>
    request(app(), env, "/api/tasks/help/open", {
      method: "POST",
      token,
      body: JSON.stringify({ taskId: fixture.input.taskId, item, level, contentHash }),
    });
  const pass = (status: "passed" | "ai-passed" = "passed") =>
    db.insert(taskProgress).values({
      userId: "learner",
      taskId: fixture.input.taskId,
      contentHash: fixture.bundle.contentHash,
      status,
    });
  const opens = () => db.select().from(taskHelpOpens);
  const ok = async (response: Response) => {
    expect(response.status, await response.clone().text()).toBe(200);
    return json<TaskHelpResponse>(response);
  };
  const submit = () =>
    request(app(), env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({ ...fixture.input, support: [] }),
    });

  describe("基礎 (ヒント 2 段 → 解答例、合格後に解答例と解説)", () => {
    beforeEach(() => setup("basic", { hintLevels: 2, solutionUnlock: "after-hints" }));

    it("解放前は状態だけを返し、ヒントの題・本文・解答例・解説・観点・予備を返さない", async () => {
      const body = await ok(await help());
      expect(body).toMatchObject({
        kind: "basic",
        status: "not-started",
        phase: "working",
        referencesOnly: false,
        hints: [
          { level: 1, state: "available" },
          { level: 2, state: "locked", reason: "previous-hint" },
        ],
        solution: { state: "locked", reason: "hints-first" },
        explanation: { state: "locked", reason: "passed" },
        autoOpen: [],
        latestSubmission: null,
      });
      expect(leaked(body, ...Object.values(MARK))).toEqual([]);
    });

    it("ヒントは 1 段ずつ開け、開いたことを記録してから本文を返す", async () => {
      const skipped = await open("hint", 2);
      expect(skipped.status).toBe(403);
      expect(leaked(await skipped.text(), MARK.hint2)).toEqual([]);
      expect(await opens()).toEqual([]);

      const first = await ok(await open("hint", 1));
      expect(first.hints[0]).toMatchObject({
        state: "opened",
        title: MARK.hint1Title,
        markdown: MARK.hint1,
      });
      expect(first.hints[1]).toEqual({ level: 2, state: "available" });
      expect(leaked(first, MARK.hint2, MARK.hint2Title, MARK.solution)).toEqual([]);
      // もう一度開いても記録は最初の 1 回。
      await ok(await open("hint", 1));
      expect(await opens()).toMatchObject([
        {
          tenantId: "ses",
          userId: "learner",
          taskId: fixture.input.taskId,
          item: "hint",
          level: 1,
          contentHash: fixture.bundle.contentHash,
          afterPass: false,
        },
      ]);
      // 読むだけの GET は、開いた段の本文を返し続ける。
      expect((await ok(await help())).hints[0]).toMatchObject({ markdown: MARK.hint1 });

      expect((await open("solution")).status).toBe(403);
      await ok(await open("hint", 2));
      const solved = await ok(await open("solution"));
      expect(solved.solution).toMatchObject({
        state: "opened",
        files: [{ path: "index.html", content: PRIVATE_FILES["solution/index.html"] }],
      });
      // 解説は合格後。予備の類題とレビューの観点は返さない。
      expect((await open("explanation")).status).toBe(403);
      expect(leaked(solved, MARK.explanation, MARK.review, MARK.variant)).toEqual([]);
    });

    it("合格後は解答例と解説を自動で開く印を返し、開くと合格後の記録になる", async () => {
      await pass("ai-passed");
      const body = await ok(await help());
      expect(body).toMatchObject({
        status: "ai-passed",
        phase: "passed",
        solution: { state: "available" },
        explanation: { state: "available" },
        autoOpen: ["solution", "explanation"],
      });
      expect(leaked(body, MARK.solution, MARK.explanation)).toEqual([]);
      const explained = await ok(await open("explanation"));
      expect(explained.explanation).toMatchObject({
        state: "opened",
        markdown: expect.stringContaining(MARK.explanation),
      });
      expect(await opens()).toMatchObject([{ item: "explanation", level: 0, afterPass: true }]);
      expect(leaked(explained, MARK.review, MARK.variant)).toEqual([]);
    });

    it("開いた記録は提出の支援に入り、支援の記録で二重に数えない", async () => {
      await ok(await open("hint", 1));
      await ok(await open("hint", 2));
      const response = await submit();
      expect(response.status, await response.clone().text()).toBe(201);
      const [row] = await db.select().from(submissions);
      expect(row.supportLog).toEqual([
        expect.objectContaining({ kind: "hint", detail: "ヒントを 2 段目まで開いた記録 (LMS)" }),
      ]);
      expect(
        await hasRecordedSupport(db, {
          tenantId: "ses",
          studentId: "learner",
          taskId: fixture.input.taskId,
          submittedAt: row.submittedAt,
        }),
      ).toBe(true);
      const records = await json<{ tasks: TaskSupportRecord[] }>(
        await request(app(), env, "/api/task-support?stageId=stage", { token }),
      );
      const record = records.tasks.find((t) => t.taskId === fixture.input.taskId);
      // 開いた 2 段をそれぞれ 1 件ずつ。提出に写った LMS の記録は重ねて数えない。
      expect(record?.counts.hint).toBe(2);
      expect(record?.events.map((e) => e.detail)).toEqual(
        expect.arrayContaining(["ヒント 1 段目を開いた", "ヒント 2 段目を開いた"]),
      );
      // 応答に返された提出の最新は、拡張がレビューの結果を読むのに使う。
      expect((await ok(await help())).latestSubmission).toMatchObject({ attempt: 1 });
    });

    it("提出より後に開いたものは、その提出の支援に数えない", async () => {
      expect((await submit()).status).toBe(201);
      await ok(await open("hint", 1));
      const [row] = await db.select().from(submissions);
      expect(row.supportLog).toEqual([]);
      // 同じミリ秒に重ならないよう、開いた時刻を提出の 1 秒後に置く。
      await db.update(taskHelpOpens).set({ openedAt: new Date(row.submittedAt.getTime() + 1000) });
      expect(
        await hasRecordedSupport(db, {
          tenantId: "ses",
          studentId: "learner",
          taskId: fixture.input.taskId,
          submittedAt: row.submittedAt,
        }),
      ).toBe(false);
    });

    it("受講していない・他テナントの受講者には 404 で、記録もしない", async () => {
      for (const as of [otherToken, strangerToken]) {
        expect((await help(as)).status).toBe(404);
        expect((await open("hint", 1, as)).status).toBe(404);
      }
      expect(await opens()).toEqual([]);
    });

    it("予備の類題・レビューの観点は素材の種類として受け付けない", async () => {
      await pass();
      for (const item of ["variants", "review", "fixed-start"])
        expect((await open(item)).status).toBe(400);
      expect(await opens()).toEqual([]);
    });
  });

  describe("自力 (挑戦の回数か合格後)", () => {
    beforeEach(() =>
      setup("independent", { hintLevels: 1, solutionUnlock: "attempts-or-passed", attempts: 3 }),
    );

    it("手元の失敗と提出を挑戦として数え、回数に達するまで解答例を返さない", async () => {
      const before = await ok(await help());
      expect(before.attempts).toEqual({ count: 0, required: 3 });
      expect(before.solution).toEqual({ state: "locked", reason: "attempts" });
      expect((await open("solution")).status).toBe(403);
      await db.insert(taskLocalRuns).values({
        userId: "learner",
        taskId: fixture.input.taskId,
        tenantId: "ses",
        contentHash: fixture.bundle.contentHash,
        failedRuns: 2,
        failureStreak: 2,
        lastOutcome: "failed",
        firstRunAt: new Date(),
        lastRunAt: new Date(),
      });
      expect((await ok(await help())).attempts).toEqual({ count: 2, required: 3 });
      expect((await submit()).status).toBe(201);
      const after = await ok(await help());
      expect(after.attempts).toEqual({ count: 3, required: 3 });
      expect(after.solution).toEqual({ state: "available" });
      const opened = await ok(await open("solution"));
      expect(JSON.stringify(opened)).toContain(PRIVATE_FILES["solution/index.html"]);
      // 解説 (別解・選び方の理由) は合格後。自動では開かない。
      expect(opened.explanation).toEqual({ state: "locked", reason: "passed" });
    });

    it("他テナントの手元の記録は挑戦に数えない", async () => {
      await db.insert(taskLocalRuns).values({
        userId: "learner",
        taskId: fixture.input.taskId,
        tenantId: "other",
        contentHash: fixture.bundle.contentHash,
        failedRuns: 9,
        lastOutcome: "failed",
        firstRunAt: new Date(),
        lastRunAt: new Date(),
      });
      expect((await ok(await help())).attempts).toEqual({ count: 0, required: 3 });
    });

    it("合格後は自動では開かず、解答例と解説を開ける", async () => {
      await pass();
      const body = await ok(await help());
      expect(body.autoOpen).toEqual([]);
      expect(body.solution).toEqual({ state: "available" });
      expect(body.explanation).toEqual({ state: "available" });
    });
  });

  describe("確認A・B (取り組み中は参照元だけ)", () => {
    it("確認A は取り組み中に何も返さず、合格の判定のあとに解答例だけを開ける", async () => {
      // 教材の検査を通らない設定が D1 に入っていても、種別の方針で止める。
      await setup("assessment-a", { hintLevels: 2, solutionUnlock: "after-hints" });
      const working = await ok(await help());
      expect(working).toMatchObject({
        referencesOnly: true,
        hints: [],
        solution: { state: "locked", reason: "passed" },
        explanation: { state: "locked", reason: "not-offered" },
      });
      expect(working.notice).toContain("公式ドキュメントと文法の参照だけ");
      for (const [item, level] of [
        ["hint", 1],
        ["solution", undefined],
        ["explanation", undefined],
      ] as const)
        expect((await open(item, level)).status).toBe(403);
      expect(await opens()).toEqual([]);
      expect(leaked(working, ...Object.values(MARK))).toEqual([]);

      await pass();
      const decided = await ok(await open("solution"));
      expect(decided.solution.state).toBe("opened");
      expect((await open("explanation")).status).toBe(403);
      expect(leaked(decided, MARK.explanation, MARK.review, MARK.variant, MARK.hint1)).toEqual([]);
    });

    it("確認A で解答例を開いたあとの提出は、AI で確定せず人に回す", async () => {
      await setup("assessment-a", { hintLevels: 0, solutionUnlock: "passed" });
      await pass();
      await ok(await open("solution"));
      const response = await submit();
      expect(response.status, await response.clone().text()).toBe(201);
      const [row] = await db.select().from(submissions);
      expect(row.supportLog).toEqual([
        expect.objectContaining({ kind: "solution", detail: "解答例を開いた記録 (LMS・合格後)" }),
      ]);
      expect(row.aiReviewStatus).toBe("escalated");
    });

    it("確認B は合格後も解答例・解説を返さない", async () => {
      await setup("assessment-b", { hintLevels: 0, solutionUnlock: "passed" });
      await pass();
      const body = await ok(await help());
      expect(body.solution).toEqual({ state: "locked", reason: "not-offered" });
      expect(body.explanation).toEqual({ state: "locked", reason: "not-offered" });
      expect((await open("solution")).status).toBe(403);
      expect(leaked(body, ...Object.values(MARK))).toEqual([]);
    });
  });

  it("統合は取り組み中に参照元だけで、合格後に解答例 (解説は返さない)", async () => {
    await setup("integration", { hintLevels: 0, solutionUnlock: "passed" });
    const working = await ok(await help());
    expect(working.referencesOnly).toBe(true);
    expect(working.notice).toContain("API 契約");
    expect((await open("solution")).status).toBe(403);
    await pass();
    expect((await ok(await open("solution"))).solution.state).toBe("opened");
    expect((await open("explanation")).status).toBe(403);
  });

  describe("受講者の手元の版 (配布記録の contentHash) の素材だけを出す", () => {
    const OLD_HASH = "b".repeat(64);
    const OLD = {
      hint1: "OLD_HINT_ONE_57",
      solution: "OLD_SOLUTION_57",
      explanation: "OLD_EXPLANATION_57",
    };
    const OLD_FILES = JSON.stringify({
      "hints.md": encode(`## ヒント1 方針\n${OLD.hint1}\n\n## ヒント2\n二段目\n`),
      "solution/index.html": encode(`<h1>${OLD.solution}</h1>`),
      "explanation.md": encode(OLD.explanation),
      "review.md": encode(MARK.review),
    });
    const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
    /** 前の版の課題と、その版で配っていた非公開の素材の版。 */
    async function addOldRevision(options: { privateHash?: string | null; kind?: TaskKind } = {}) {
      const privateHash =
        options.privateHash === undefined ? sha256(OLD_FILES) : options.privateHash;
      const bundle = {
        ...fixture.bundle,
        contentHash: OLD_HASH,
        manifest: { ...fixture.bundle.manifest, kind: options.kind ?? "basic" },
      };
      await db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: OLD_HASH,
        definition: JSON.stringify({ support: { hintLevels: 2, solutionUnlock: "after-hints" } }),
        bundle: JSON.stringify(bundle),
        privateHash,
      });
      if (privateHash)
        await db
          .insert(taskPrivateVersions)
          .values({ taskId: fixture.input.taskId, privateHash, files: OLD_FILES });
    }
    beforeEach(() => setup("basic", { hintLevels: 2, solutionUnlock: "after-hints" }));

    it("前の版の受講者には、その版のヒント・解答例・解説を出し、記録も出した版にする", async () => {
      await addOldRevision();
      const first = await ok(await openAt(OLD_HASH, "hint", 1));
      expect(first.hints[0]).toMatchObject({ state: "opened", markdown: OLD.hint1 });
      expect(leaked(first, ...Object.values(MARK))).toEqual([]);
      expect(await opens()).toMatchObject([
        { item: "hint", level: 1, contentHash: OLD_HASH, privateHash: sha256(OLD_FILES) },
      ]);
      await ok(await openAt(OLD_HASH, "hint", 2));
      const solved = await ok(await openAt(OLD_HASH, "solution"));
      expect(JSON.stringify(solved)).toContain(encode(`<h1>${OLD.solution}</h1>`));
      expect(leaked(solved, MARK.solution, MARK.hint1, MARK.hint2)).toEqual([]);
      // 今の版で読むと、前の版で開いた本文は出さない (今の版の本文は開き直して記録する)。
      const current = await ok(await help());
      expect(current.hints[0]).toEqual({ level: 1, state: "available" });
      expect(current.solution).toEqual({ state: "available" });
      expect(JSON.stringify(current)).not.toContain(OLD.hint1);
      const reopened = await ok(await open("hint", 1));
      expect(reopened.hints[0]).toMatchObject({ markdown: MARK.hint1 });
      expect(await opens()).toHaveLength(4);
    });

    it("前の版の素材の版が分からなければ、素材を出さず受け取り直しを案内する", async () => {
      await addOldRevision({ privateHash: null });
      const body = await ok(await helpAt(OLD_HASH));
      expect(body.hints).toEqual([
        { level: 1, state: "locked", reason: "stale-version" },
        { level: 2, state: "locked", reason: "stale-version" },
      ]);
      expect(body.solution).toEqual({ state: "locked", reason: "stale-version" });
      expect(body.explanation).toEqual({ state: "locked", reason: "stale-version" });
      expect(leaked(body, ...Object.values(MARK), ...Object.values(OLD))).toEqual([]);
      const refused = await openAt(OLD_HASH, "hint", 1);
      expect(refused.status).toBe(409);
      const text = await refused.text();
      expect(text).toContain("手元の課題が古い版です。最新を受け取り直すと開けます");
      expect(leaked(text, ...Object.values(MARK), ...Object.values(OLD))).toEqual([]);
      expect(await opens()).toEqual([]);
    });

    it("知らない版を名乗っても、今の版の素材を出さない", async () => {
      const unknown = "c".repeat(64);
      expect((await ok(await helpAt(unknown))).solution).toEqual({
        state: "locked",
        reason: "stale-version",
      });
      expect((await openAt(unknown, "hint", 1)).status).toBe(409);
      expect(await opens()).toEqual([]);
      expect((await openAt("not-a-hash", "hint", 1)).status).toBe(400);
    });

    it("前の版の種別が厳しければ、その版でも今の版でも開けるものだけを出す", async () => {
      await addOldRevision({ kind: "assessment-a" });
      const body = await ok(await helpAt(OLD_HASH));
      expect(body.referencesOnly).toBe(true);
      expect(body.hints).toEqual([]);
      expect(body.solution.state).toBe("locked");
      expect((await openAt(OLD_HASH, "hint", 1)).status).toBe(403);
      expect(await opens()).toEqual([]);
    });
  });

  it("同じ時刻の提出は、試行の番号が大きい方を最新にする", async () => {
    await setup("basic", { hintLevels: 2, solutionUnlock: "after-hints" });
    const submittedAt = new Date("2026-10-05T00:00:00Z");
    const row = {
      tenantId: "ses",
      studentId: "learner",
      taskId: fixture.input.taskId,
      stageTitle: "開発環境",
      assignmentTitle: "課題",
      code: "",
      submittedAt,
    };
    await db.insert(submissions).values([
      { ...row, id: "first", attempt: 1 },
      { ...row, id: "second", attempt: 2 },
    ]);
    expect((await ok(await help())).latestSubmission).toEqual({ id: "second", attempt: 2 });
  });

  it("hints.md を段に分けられない課題は、ヒントを出さず解答例も合格後だけにする", async () => {
    await setup("basic", { hintLevels: 2, solutionUnlock: "after-hints" });
    await db
      .update(taskPrivate)
      .set({ files: JSON.stringify({ ...PRIVATE_FILES, "hints.md": encode("壊れた hints") }) })
      .where(eq(taskPrivate.taskId, fixture.input.taskId));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const body = await ok(await help());
    expect(body.hints).toEqual([]);
    expect(body.solution).toEqual({ state: "locked", reason: "passed" });
    // ログに素材の本文を出さない。
    expect(JSON.stringify(warn.mock.calls)).not.toContain("壊れた hints");
    warn.mockRestore();
  });
});
