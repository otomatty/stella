import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { getDb } from "../db/client.js";
import {
  auditLogs,
  certificates,
  enrollments,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  resourceLocks,
  sections,
  skillEvidence,
  skills,
  stages,
  submissionReviews,
  submissionFiles,
  submissions,
  taskProgress,
  taskRevisions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { reviewTaskSubmission, syncReviewedLesson } from "../lib/task-submission.js";
import { taskCompletionCounts } from "../lib/task-completion.js";
import { reviewedProgressRows } from "../lib/reviewed-progress.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { certificatesRoute } from "./certificates.js";
import { lessonProgressRoute } from "./lesson-progress.js";
import { submissionsRoute } from "./submissions.js";

describe("課題の提出から人の合格まで (実 SQLite / R2)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  let token: string;
  let instructorToken: string;
  let objects: Map<string, Uint8Array>;
  const caller = {
    id: "teacher",
    tenantId: "ses",
    role: "instructor" as const,
    name: "講師",
    email: null,
  };
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
    fixture = await submissionFixture();
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", displayName: "受講者", role: "student" },
        { id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" },
        { id: "other", tenantId: "ses", displayName: "他の受講者", role: "student" },
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
      db.insert(lessons).values({ id: "reading", sectionId: "unit", title: "読む", type: "text" }),
      db
        .insert(enrollments)
        .values({ tenantId: "ses", userId: "learner", stageId: "stage", status: "active" }),
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
          submit: { explanation: true, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
        definition: JSON.stringify({
          submit: { explanation: true, debuggingRecord: false },
          skills: { assesses: ["html"] },
        }),
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(skills).values({ id: "html", title: "HTML" }),
      db
        .insert(lessonProgress)
        .values({ tenantId: "ses", userId: "learner", lessonId: "reading", completed: true }),
    ]);
    token = await signAccessToken("test-secret", "learner", "test@example.com");
    instructorToken = await signAccessToken("test-secret", "teacher", "teacher@example.com");
  });
  afterEach(() => database.sqlite.close());
  async function post() {
    const { app } = mountTestApp(env, submissionsRoute);
    return request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify(fixture.input),
    });
  }
  async function submit() {
    const response = await post();
    expect(response.status, await response.clone().text()).toBe(201);
    return (await json<{ row: { id: string; attempt: number } }>(response)).row;
  }
  it("全ファイルを R2 に保存し、再提出を新しい試行として残す", async () => {
    const first = await submit();
    const second = await submit();
    expect(first.id).not.toBe(second.id);
    expect([first.attempt, second.attempt]).toEqual([1, 2]);
    expect(objects.size).toBe(2);
    expect((await db.select().from(submissions)).map((s) => s.code)).toEqual(["", ""]);
    expect((await db.select().from(taskProgress))[0].status).toBe("submitted");
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.size).toBe(0);
  });
  it("一覧は提出ごとの記録を返さず、詳細だけが返す", async () => {
    const row = await submit();
    const { app } = mountTestApp(env, submissionsRoute);
    const detailKeys = [
      "task_snapshot",
      "local_result",
      "test_hashes",
      "debugging_record",
      "support_log",
      "machine_check",
    ];
    for (const [path, as] of [
      ["/api/submissions", instructorToken],
      ["/api/submissions/mine", token],
    ] as const) {
      const response = await request(app, env, path, { token: as });
      expect(response.status, await response.clone().text()).toBe(200);
      const { rows } = await json<{ rows: Record<string, unknown>[] }>(response);
      expect(rows[0]).toMatchObject({ id: row.id, task_id: fixture.input.taskId });
      for (const key of detailKeys) expect(rows[0]).not.toHaveProperty(key);
    }
    const detail = await request(app, env, `/api/submissions/${row.id}`, {
      token: instructorToken,
    });
    const { row: full } = await json<{ row: Record<string, unknown> }>(detail);
    for (const key of detailKeys) expect(full).toHaveProperty(key);
    expect(full.task_snapshot).toMatchObject({ contentHash: fixture.bundle.contentHash });
  });
  it("上限の50ファイルをD1の100バインド制限内で保存し、51件目は保存しない", async () => {
    fixture = await submissionFixture({ submit: { files: ["*.html"] } });
    const first = fixture.input.files[0];
    const hash = fixture.input.localResult.files[0];
    fixture.input.files = Array.from({ length: 50 }, (_, i) => ({
      ...first,
      path: `page-${i}.html`,
    }));
    fixture.input.localResult.files = fixture.input.files.map((f) => ({ ...hash, path: f.path }));
    await db
      .update(taskRevisions)
      .set({ bundle: JSON.stringify(fixture.bundle) })
      .where(eq(taskRevisions.taskId, fixture.input.taskId));
    const row = await submit();
    expect(objects.size).toBe(50);
    expect((await db.select().from(submissionFiles)).length).toBe(50);
    const { app } = mountTestApp(env, submissionsRoute);
    const detail = await json<{ row: { files: { path: string; content: string }[] } }>(
      await request(app, env, `/api/submissions/${row.id}`, { token: instructorToken }),
    );
    expect(detail.row.files.length).toBe(50);
    expect(detail.row.files.every((f) => f.content === first.content)).toBe(true);
    fixture.input.files.push({ ...first, path: "extra.html" });
    expect((await post()).status).toBe(400);
    expect(objects.size).toBe(50);
    expect((await db.select().from(submissions)).length).toBe(1);
  });
  it("テスト改変を講師の確認待ちにし、AI からの合格を拒否する", async () => {
    fixture.input.protected[0].sha256 = "b".repeat(64);
    const row = await submit();
    expect((await db.select().from(taskProgress))[0].status).toBe("instructor-pending");
    await expect(reviewTaskSubmission(db, caller, row.id, "pass", "", "ai")).rejects.toMatchObject({
      status: 409,
    });
  });
  it("人の合格はスキル証拠を保存しステージをクリアする", async () => {
    const row = await submit();
    const { app } = mountTestApp(env, submissionsRoute);
    const response = await request(app, env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({ verdict: "pass", reviewNotes: "よい実装です" }),
    });
    expect(response.status, await response.clone().text()).toBe(200);
    expect((await db.select().from(taskProgress))[0].status).toBe("passed");
    expect((await db.select().from(skillEvidence))[0]).toMatchObject({
      userId: "learner",
      skillId: "html",
      submissionId: row.id,
      level: "independent",
      assisted: false,
    });
    expect((await db.select().from(submissionReviews))[0].taskContentHash).toBe(
      fixture.bundle.contentHash,
    );
    expect((await db.select().from(certificates)).length).toBe(1);
  });
  it.each(["resubmit", "fail"] as const)(
    "合格から%sへの訂正を通知し、判定が同じ保存や総評だけの編集では通知しない",
    async (corrected) => {
      const row = await submit();
      const { app } = mountTestApp(env, submissionsRoute);
      const patch = async (body: object) => {
        const response = await request(app, env, `/api/submissions/${row.id}`, {
          method: "PATCH",
          token: instructorToken,
          body: JSON.stringify(body),
        });
        expect(response.status, await response.clone().text()).toBe(200);
      };
      const notices = () =>
        db.select().from(notifications).where(eq(notifications.type, "review_completed"));
      await patch({ verdict: "pass" });
      expect((await notices()).length).toBe(1);
      const firstPassedAt = (await db.select().from(taskProgress))[0].passedAt;
      expect(firstPassedAt).toBeInstanceOf(Date);
      await patch({ verdict: corrected, reviewNotes: "判定を訂正しました" });
      expect((await notices()).length).toBe(2);
      const correction = (await notices()).find((n) => n.payload.verdict === corrected);
      expect(correction?.title).toContain("添削結果が変更されました");
      expect(correction?.payload.submission_id).toBe(row.id);
      expect((await db.select().from(certificates)).length).toBe(0);
      expect((await db.select().from(taskProgress))[0].status).toBe("resubmit");
      await patch({ verdict: corrected, reviewNotes: "同じ判定を保存" });
      await patch({ reviewNotes: "総評だけを編集" });
      expect((await notices()).length).toBe(2);
      await patch({ verdict: "pass" });
      expect((await notices()).length).toBe(3);
      expect((await db.select().from(taskProgress))[0].passedAt).toEqual(firstPassedAt);
    },
  );
  it("同じ提出への確定が重なっても、初回の確定と訂正を 1 回ずつ通知する", async () => {
    await db.insert(lessons).values({
      id: "code",
      sectionId: "unit",
      type: "code",
      title: "演習",
      assignmentId: "exercise",
    });
    const { app } = mountTestApp(env, submissionsRoute);
    const legacy = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({
        lessonId: "code",
        assignmentId: "exercise",
        stageTitle: "開発環境",
        assignmentTitle: "演習",
        code: "x",
        priority: "normal",
      }),
    });
    expect(legacy.status, await legacy.clone().text()).toBe(200);
    const legacyId = (await json<{ row: { id: string } }>(legacy)).row.id;
    const task = await submit();
    for (const [id, lockId] of [
      [task.id, `task-submission:ses:learner:${fixture.input.taskId}`],
      [legacyId, `submission-review:${legacyId}`],
    ]) {
      // 判定の書き込みを先に塞ぎ、両方の要求が保存前の行を読んでから書き込みを待つようにする。
      await db
        .insert(resourceLocks)
        .values({ id: lockId, holder: "test", expiresAt: new Date(Date.now() + 60_000) });
      const released = new Promise<void>((resolve) =>
        setTimeout(() => {
          void db
            .delete(resourceLocks)
            .where(eq(resourceLocks.id, lockId))
            .then(() => resolve());
        }, 100),
      );
      const responses = await Promise.all(
        (["pass", "fail"] as const).map((verdict) =>
          request(app, env, `/api/submissions/${id}`, {
            method: "PATCH",
            token: instructorToken,
            body: JSON.stringify({ verdict }),
          }),
        ),
      );
      await released;
      for (const r of responses) expect(r.status, await r.clone().text()).toBe(200);
      const notices = (
        await db.select().from(notifications).where(eq(notifications.type, "review_completed"))
      ).filter((n) => n.payload.submission_id === id);
      expect(notices).toHaveLength(2);
      expect(notices.filter((n) => n.title.endsWith("が完了しました"))).toHaveLength(1);
      expect(notices.filter((n) => n.title.endsWith("結果が変更されました"))).toHaveLength(1);
      expect(new Set(notices.map((n) => n.payload.verdict))).toEqual(new Set(["pass", "fail"]));
    }
  });

  it("支援付きの合格と AI の合格を区別する", async () => {
    fixture.input.support = [{ kind: "hint", at: "2026-10-05T00:00:00Z" }];
    const row = await submit();
    await reviewTaskSubmission(db, caller, row.id, "pass", "", "ai");
    expect((await db.select().from(skillEvidence))[0].level).toBe("supported");
    expect((await db.select().from(taskProgress))[0].status).toBe("ai-passed");
    expect((await taskCompletionCounts(db, "stage", ["learner"])).passed.get("learner")?.size).toBe(
      1,
    );
  });
  it("課題更新後も旧版への提出と過去の合格を保持する", async () => {
    const first = await submit();
    await reviewTaskSubmission(db, caller, first.id, "pass", "旧版で合格");
    await db
      .update(tasks)
      .set({
        contentHash: "b".repeat(64),
        bundle: JSON.stringify({ ...fixture.bundle, contentHash: "b".repeat(64) }),
      })
      .where(eq(tasks.id, fixture.input.taskId));
    const second = await submit();
    await reviewTaskSubmission(db, caller, second.id, "resubmit", "もう一度");
    expect((await db.select().from(taskProgress))[0].status).toBe("passed");
    const { app } = mountTestApp(env, submissionsRoute);
    const detail = await json<{
      row: { task_snapshot: { contentHash: string }; files: { path: string; content: string }[] };
    }>(await request(app, env, `/api/submissions/${first.id}`, { token: instructorToken }));
    expect(detail.row.task_snapshot.contentHash).toBe("a".repeat(64));
    expect(Buffer.from(detail.row.files[0].content, "base64").toString()).toBe(fixture.source);
  });
  it("他人と未受講者は提出コードを取得・提出できない", async () => {
    const row = await submit();
    const { app } = mountTestApp(env, submissionsRoute);
    const other = await signAccessToken("test-secret", "other", "other@example.com");
    expect((await request(app, env, `/api/submissions/${row.id}`, { token: other })).status).toBe(
      403,
    );
    token = other;
    expect((await post()).status).toBe(404);
    expect(
      (
        await request(app, env, `/api/submissions/${row.id}`, {
          token,
          method: "PATCH",
          body: JSON.stringify({ verdict: "pass" }),
        })
      ).status,
    ).toBe(403);
  });
  it("保存失敗・未宣言ファイル・説明不足では提出を作らない", async () => {
    fixture.input.files.push({ path: ".env", content: "" });
    expect((await post()).status).toBe(400);
    fixture.input.files.pop();
    fixture.input.explanation = "";
    expect((await post()).status).toBe(400);
    fixture.input.explanation = "説明";
    vi.mocked(env.SUBMISSIONS_BUCKET?.put)?.mockRejectedValueOnce(new Error("R2 failure"));
    expect((await post()).status).toBe(503);
    expect((await db.select().from(submissions)).length).toBe(0);
    expect(objects.size).toBe(0);
  });
  describe("確認Bの定着", () => {
    const DAY = 86_400_000;
    const hash = "c".repeat(64);
    beforeEach(async () => {
      await db.insert(tasks).values(
        (
          [
            ["check-a", "assessment-a", "page"],
            ["check-b", "assessment-b", "page"],
            ["check-a2", "assessment-a", "page"],
            // 別パターンのAは、このBの前提にしない。
            ["check-a-form", "assessment-a", "form"],
          ] as const
        ).map(([id, kind, pattern], i) => ({
          id,
          sectionId: "unit",
          title: id,
          kind,
          pattern,
          skills: { uses: [], assesses: ["html"] },
          estimatedMinutes: 10,
          order: i + 1,
          contentHash: hash,
          definition: "{}",
          bundle: "{}",
        })),
      );
    });
    /** 確認課題の提出を作り、講師が合格にする。 */
    async function passCheck(
      taskId: string,
      kind: string,
      submittedAt: Date,
      version: { contentHash: string; skills: string[]; attempt?: number } = {
        contentHash: hash,
        skills: ["html"],
      },
    ) {
      const id = crypto.randomUUID();
      await db.insert(submissions).values({
        id,
        tenantId: "ses",
        studentId: "learner",
        stageTitle: "開発環境",
        assignmentTitle: taskId,
        code: "",
        taskId,
        taskKind: kind,
        taskContentHash: version.contentHash,
        assessedSkills: version.skills,
        attempt: version.attempt ?? 1,
        submittedAt,
      });
      await reviewTaskSubmission(db, caller, id, "pass", "");
      return id;
    }
    const levelOf = async (submissionId: string) =>
      (await db.select().from(skillEvidence).where(eq(skillEvidence.submissionId, submissionId)))[0]
        ?.level;
    /** 同じパターンの確認Aに合格し、初回合格日を過去にずらす (合格日は DB のトリガーが入れる)。 */
    async function passA(passedAt: number) {
      const ids: string[] = [];
      for (const taskId of ["check-a", "check-a2"]) {
        ids.push(await passCheck(taskId, "assessment-a", new Date(passedAt)));
        await db
          .update(taskProgress)
          .set({ passedAt: new Date(passedAt) })
          .where(eq(taskProgress.taskId, taskId));
      }
      return ids;
    }

    it("無関係な課題の古い証跡では、確認Aに合格していないBを定着にしない", async () => {
      const basic = await submit();
      await reviewTaskSubmission(db, caller, basic.id, "pass", "");
      await db.update(skillEvidence).set({ createdAt: new Date(Date.now() - 30 * DAY) });
      const b = await passCheck("check-b", "assessment-b", new Date());
      expect(await levelOf(b)).toBe("independent");
    });

    it("確認Aの合格から7日たつ前に解いたBは、後でレビューしても定着にしない", async () => {
      const aPassed = Date.now() - 10 * DAY;
      await passA(aPassed);
      const b = await passCheck("check-b", "assessment-b", new Date(aPassed + 3 * DAY));
      expect(await levelOf(b)).toBe("independent");
    });

    it("同じ単元・パターンの確認Aの合格から7日後以降に解いたBを定着にする", async () => {
      const aPassed = Date.now() - 10 * DAY;
      await passA(aPassed);
      const b = await passCheck("check-b", "assessment-b", new Date(aPassed + 8 * DAY));
      expect(await levelOf(b)).toBe("retained");
    });

    it("同じパターンの確認Aのどれかの合格が訂正されたら、Bを定着にしない", async () => {
      const aPassed = Date.now() - 10 * DAY;
      const [, a2] = await passA(aPassed);
      // 同じ版のまま訂正しても passed_at はトリガーが残すが、状態は合格でなくなる。
      await reviewTaskSubmission(db, caller, a2, "resubmit", "訂正");
      const [corrected] = await db
        .select()
        .from(taskProgress)
        .where(eq(taskProgress.taskId, "check-a2"));
      expect(corrected).toMatchObject({ status: "resubmit", passedAt: new Date(aPassed) });
      const b = await passCheck("check-b", "assessment-b", new Date(aPassed + 8 * DAY));
      expect(await levelOf(b)).toBe("independent");
    });

    it("定着にしたあとで確認Aの合格を訂正したらBは自力に戻り、合格に戻せば定着に戻る", async () => {
      const aPassed = Date.now() - 10 * DAY;
      const [, a2] = await passA(aPassed);
      const b = await passCheck("check-b", "assessment-b", new Date(aPassed + 8 * DAY));
      expect(await levelOf(b)).toBe("retained");
      await reviewTaskSubmission(db, caller, a2, "fail", "訂正");
      expect(await levelOf(b)).toBe("independent");
      await reviewTaskSubmission(db, caller, a2, "pass", "再訂正");
      expect(await levelOf(b)).toBe("retained");
    });

    it("確認Aの教材が更新されたら、旧版への合格ではBを定着にしない", async () => {
      const aPassed = Date.now() - 10 * DAY;
      await passA(aPassed);
      await db
        .update(tasks)
        .set({ contentHash: "d".repeat(64) })
        .where(eq(tasks.id, "check-a2"));
      const b = await passCheck("check-b", "assessment-b", new Date(aPassed + 8 * DAY));
      expect(await levelOf(b)).toBe("independent");
    });

    it("確認Aの新しい版で確かめなくなったスキルは、旧版の証跡ではBを定着にしない", async () => {
      const aPassed = Date.now() - 10 * DAY;
      await passA(aPassed);
      // 確認Aを改訂し、html ではなく css を確かめる版にする。受講者は新しい版にも合格する。
      const revised = { contentHash: "e".repeat(64), skills: ["css"], attempt: 2 };
      await db.insert(skills).values({ id: "css", title: "CSS" });
      for (const taskId of ["check-a", "check-a2"]) {
        await db
          .update(tasks)
          .set({ contentHash: revised.contentHash })
          .where(eq(tasks.id, taskId));
        await passCheck(taskId, "assessment-a", new Date(aPassed), revised);
        await db
          .update(taskProgress)
          .set({ passedAt: new Date(aPassed) })
          .where(eq(taskProgress.taskId, taskId));
      }
      // 確認Aは今の版で合格しているので、前提そのものは満たす (css なら定着になる)。
      expect(
        (await db.select().from(taskProgress)).filter((p) => p.taskId.startsWith("check-a")),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ taskId: "check-a", contentHash: revised.contentHash }),
          expect.objectContaining({ taskId: "check-a2", contentHash: revised.contentHash }),
        ]),
      );
      const b = await passCheck("check-b", "assessment-b", new Date(aPassed + 8 * DAY), {
        contentHash: hash,
        skills: ["html", "css"],
      });
      const levels = await db
        .select({ skillId: skillEvidence.skillId, level: skillEvidence.level })
        .from(skillEvidence)
        .where(eq(skillEvidence.submissionId, b));
      expect(Object.fromEntries(levels.map((l) => [l.skillId, l.level]))).toEqual({
        html: "independent",
        css: "retained",
      });
    });

    it("確認Aが支援付きの合格なら、Bを定着にしない", async () => {
      const aPassed = Date.now() - 10 * DAY;
      await passA(aPassed);
      await db.update(skillEvidence).set({ assisted: true, level: "supported" });
      const b = await passCheck("check-b", "assessment-b", new Date(aPassed + 8 * DAY));
      expect(await levelOf(b)).toBe("independent");
    });
  });

  it("旧コードレッスンは自己申告で完了せず、講師の合格で完了する", async () => {
    await db.insert(lessons).values({
      id: "code",
      sectionId: "unit",
      type: "code",
      title: "演習",
      assignmentId: "exercise",
    });
    const rows = [
      {
        lessonId: "code",
        completed: true,
        lastPage: null,
        viewedPages: [],
        watchedSec: null,
        updatedAtMs: Date.now(),
        countsTowardActivity: true,
        activityDate: "2026-10-05",
      },
    ];
    expect((await reviewedProgressRows(db, "ses", "learner", rows)).rows[0].completed).toBe(false);
    const { app } = mountTestApp(env, submissionsRoute);
    const body = {
      lessonId: "code",
      assignmentId: "exercise",
      stageTitle: "開発環境",
      assignmentTitle: "演習",
      code: "x",
      priority: "normal",
      explanation: "実装と確認の説明",
    };
    const submitted = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
    expect(submitted.status, await submitted.clone().text()).toBe(200);
    const { row } = await json<{ row: { id: string; explanation: string } }>(submitted);
    expect(row.explanation).toBe(body.explanation);
    const retry = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({ ...body, explanation: "再確認の説明" }),
    });
    expect((await json<{ row: { explanation: string } }>(retry)).row.explanation).toBe(
      "再確認の説明",
    );
    expect(
      (
        await request(app, env, `/api/submissions/${row.id}`, {
          method: "PATCH",
          token: instructorToken,
          body: JSON.stringify({ verdict: "pass" }),
        })
      ).status,
    ).toBe(200);
    expect(
      (await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, "code")))[0]
        .completed,
    ).toBe(true);
    expect((await reviewedProgressRows(db, "ses", "learner", rows)).rows[0].completed).toBe(true);
  });

  /** lesson_progress を書く文の直前に、別の講師がその提出を不合格に訂正する D1 を作る。 */
  function correctedBeforeProgressWrite(submissionId: string) {
    const prepare = database.binding.prepare.bind(database.binding);
    let corrected = false;
    const binding = {
      ...database.binding,
      prepare: (query: string) => {
        if (!corrected && /^insert into "lesson_progress"/i.test(query)) {
          corrected = true;
          database.sqlite
            .prepare("update submissions set verdict = 'fail', status = 'failed' where id = ?")
            .run(submissionId);
        }
        return prepare(query);
      },
    } as unknown as D1Database;
    return { env: { ...env, DB: binding } as Env, corrected: () => corrected };
  }

  const progressOf = async (lessonId: string) =>
    (await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, lessonId)))[0]
      ?.completed;

  /** 旧形式の提出 (受講者が lesson_id / assignment_id を送る) を作り、講師が判定する。 */
  async function legacyReview(
    lessonId: string,
    assignmentId: string,
    verdict: "pass" | "resubmit",
  ) {
    const { app } = mountTestApp(env, submissionsRoute);
    const submitted = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify({
        lessonId,
        assignmentId,
        stageTitle: "開発環境",
        assignmentTitle: "演習",
        code: "x",
        priority: "normal",
      }),
    });
    expect(submitted.status, await submitted.clone().text()).toBe(200);
    const { row } = await json<{ row: { id: string } }>(submitted);
    const reviewed = await request(app, env, `/api/submissions/${row.id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify({ verdict }),
    });
    expect(reviewed.status, await reviewed.clone().text()).toBe(200);
  }

  it("コードレッスンとその課題の組を指さない旧形式の提出は、判定しても進捗に触らない", async () => {
    await db.batch([
      db.insert(lessons).values({ id: "intro", sectionId: "unit", type: "text", title: "読む2" }),
      db.insert(lessons).values({
        id: "code",
        sectionId: "unit",
        type: "code",
        title: "演習",
        assignmentId: "exercise",
      }),
    ]);
    // 文章レッスンを名乗る提出の合格で完了を作らない。
    await legacyReview("intro", "exercise", "pass");
    expect(await progressOf("intro")).toBeUndefined();
    // 自分で完了した文章レッスンを、名乗っただけの提出の再提出判定で未完了に戻さない。
    await legacyReview("reading", "reading-exercise", "resubmit");
    expect(await progressOf("reading")).toBe(true);
    // 別の課題を名乗る提出の合格では、コードレッスンを完了にしない (同期でも同じ)。
    await legacyReview("code", "other-exercise", "pass");
    expect(await progressOf("code")).toBeUndefined();
    const sync = {
      lessonId: "code",
      completed: true,
      lastPage: null,
      viewedPages: [],
      watchedSec: null,
      updatedAtMs: Date.now(),
      countsTowardActivity: true,
      activityDate: "2026-10-05",
    };
    expect((await reviewedProgressRows(db, "ses", "learner", [sync])).rows[0].completed).toBe(
      false,
    );
    // そのレッスンの課題への提出の合格なら完了する。
    await legacyReview("code", "exercise", "pass");
    expect(await progressOf("code")).toBe(true);
    expect((await reviewedProgressRows(db, "ses", "learner", [sync])).rows[0].completed).toBe(true);
  });

  it("判定の訂正が同期と重なっても、進捗は最後に保存された判定に揃う", async () => {
    await db.insert(lessons).values({
      id: "code",
      sectionId: "unit",
      type: "code",
      title: "演習",
      assignmentId: "exercise",
    });
    await legacyReview("code", "exercise", "pass");
    expect(await progressOf("code")).toBe(true);
    const [stale] = await db.select().from(submissions).where(eq(submissions.lessonId, "code"));
    // 遅れた合格側の同期が進捗を書く直前に、別の講師の不合格が保存される。
    const racing = correctedBeforeProgressWrite(stale.id);
    await syncReviewedLesson(getDb(racing.env), stale);
    expect(racing.corrected()).toBe(true);
    expect(await progressOf("code")).toBe(false);
  });

  it("端末の同期が合格を読んだあとに合格が訂正されても、進捗は訂正を上書きしない", async () => {
    await db.insert(lessons).values({
      id: "code",
      sectionId: "unit",
      type: "code",
      title: "演習",
      assignmentId: "exercise",
    });
    await legacyReview("code", "exercise", "pass");
    expect(await progressOf("code")).toBe(true);
    const [passed] = await db.select().from(submissions).where(eq(submissions.lessonId, "code"));
    const racing = correctedBeforeProgressWrite(passed.id);
    const { app } = mountTestApp(racing.env, lessonProgressRoute);
    const response = await request(app, racing.env, "/api/lesson-progress", {
      method: "POST",
      token,
      body: JSON.stringify({
        rows: [
          {
            lesson_id: "code",
            completed: true,
            last_page: null,
            viewed_pages: [],
            watched_sec: null,
            // 時計が進んだ端末: LWW では端末の書き込みが勝つ。
            updated_at: new Date(Date.now() + 60_000).toISOString(),
          },
        ],
      }),
    });
    expect(response.status, await response.clone().text()).toBe(200);
    expect(racing.corrected()).toBe(true);
    expect(await progressOf("code")).toBe(false);
  });

  describe("レビュー必須の前に自己申告で完了したコードレッスン", () => {
    /** 旧講座: コードレッスン 1 つだけ。自己申告の完了で修了証が自動発行済み。 */
    async function selfCompletedStage(issuedBy: string | null = null) {
      await db.batch([
        db.insert(stages).values({
          id: "legacy",
          tenantId: "ses",
          slug: "legacy-ts",
          title: "旧講座",
          status: "published",
        }),
        db.insert(sections).values({ id: "legacy-unit", stageId: "legacy", title: "演習" }),
        db.insert(lessons).values({
          id: "legacy-code",
          sectionId: "legacy-unit",
          type: "code",
          title: "演習",
          assignmentId: "exercise",
        }),
        db.insert(enrollments).values({
          tenantId: "ses",
          userId: "learner",
          stageId: "legacy",
          status: "completed",
          completedAt: new Date("2026-01-01T00:00:00Z"),
        }),
        db.insert(lessonProgress).values({
          tenantId: "ses",
          userId: "learner",
          lessonId: "legacy-code",
          completed: true,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        }),
        db.insert(certificates).values({
          tenantId: "ses",
          userId: "learner",
          stageId: "legacy",
          certCode: "FLC-2026-0000-0001",
          issuedBy,
          recipientName: "受講者",
          stageTitle: "旧講座",
          tenantName: "テスト",
        }),
      ]);
    }
    async function syncCompleted(updatedAt: string) {
      const { app } = mountTestApp(env, lessonProgressRoute);
      const response = await request(app, env, "/api/lesson-progress", {
        method: "POST",
        token,
        body: JSON.stringify({
          rows: [
            {
              lesson_id: "legacy-code",
              completed: true,
              last_page: null,
              viewed_pages: [],
              watched_sec: null,
              updated_at: updatedAt,
            },
          ],
        }),
      });
      expect(response.status, await response.clone().text()).toBe(200);
    }
    const legacyCertificates = () =>
      db.select().from(certificates).where(eq(certificates.stageId, "legacy"));
    const legacyEnrollment = async () =>
      (await db.select().from(enrollments).where(eq(enrollments.stageId, "legacy")))[0]?.status;

    it("同期で完了が外れたら、自動発行の修了証と受講登録の修了を巻き戻す", async () => {
      await selfCompletedStage();
      await syncCompleted("2026-10-05T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(false);
      expect(await legacyCertificates()).toHaveLength(0);
      expect(await legacyEnrollment()).toBe("active");
      const audits = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, "certificate_reclaim"));
      expect(audits).toHaveLength(1);
      expect(audits[0].metadata).toMatchObject({ stage_id: "legacy", user_id: "learner" });
    });

    it("完了が外れない同期 (LWW で負けた・合格がある) では巻き戻さない", async () => {
      await selfCompletedStage();
      // 端末の行が保存済みより古い。完了は保存済みのまま残る。
      await syncCompleted("2025-12-31T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(true);
      expect(await legacyCertificates()).toHaveLength(1);
      // そのレッスンの課題へのレビュー合格があれば、同期しても完了のまま。
      await db.insert(submissions).values({
        tenantId: "ses",
        studentId: "learner",
        lessonId: "legacy-code",
        assignmentId: "exercise",
        stageTitle: "旧講座",
        assignmentTitle: "演習",
        code: "x",
        status: "passed",
        verdict: "pass",
      });
      await syncCompleted("2026-10-05T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(true);
      expect(await legacyCertificates()).toHaveLength(1);
      expect(await legacyEnrollment()).toBe("completed");
    });

    it("staff が発行した修了証は完了が外れても残す", async () => {
      await selfCompletedStage("teacher");
      await syncCompleted("2026-10-05T00:00:00.000Z");
      expect(await progressOf("legacy-code")).toBe(false);
      expect(await legacyCertificates()).toHaveLength(1);
      expect(await legacyEnrollment()).toBe("completed");
    });

    it("別の課題を名乗る提出の合格は課題の合格に数えず、残った自己申告の完了と合わせても修了させない", async () => {
      // まだ同期し直していない移行受講者: 自己申告の完了が残り、修了証はまだ無い。
      await db.batch([
        db.insert(stages).values({
          id: "legacy",
          tenantId: "ses",
          slug: "legacy-ts",
          title: "旧講座",
          status: "published",
        }),
        db.insert(sections).values({ id: "legacy-unit", stageId: "legacy", title: "演習" }),
        db.insert(lessons).values({
          id: "legacy-code",
          sectionId: "legacy-unit",
          type: "code",
          title: "演習",
          assignmentId: "exercise",
        }),
        db.insert(enrollments).values({
          tenantId: "ses",
          userId: "learner",
          stageId: "legacy",
          status: "active",
        }),
        db.insert(lessonProgress).values({
          tenantId: "ses",
          userId: "learner",
          lessonId: "legacy-code",
          completed: true,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        }),
      ]);
      const { app } = mountTestApp(env, certificatesRoute);
      const passedAssignments = async () => {
        const mine = await json<{ completion: { passed_assignments: number } }>(
          await request(app, env, "/api/certificates/completion/legacy", { token }),
        );
        const { gradebook } = await json<{
          gradebook: {
            rows: { user_id: string; completion: { passed_assignments: number } | null }[];
          };
        }>(
          await request(app, env, "/api/certificates/gradebook/legacy", {
            token: instructorToken,
          }),
        );
        return [
          mine.completion.passed_assignments,
          gradebook.rows.find((r) => r.user_id === "learner")?.completion?.passed_assignments,
        ];
      };

      await legacyReview("legacy-code", "other-exercise", "pass");
      expect(await passedAssignments()).toEqual([0, 0]);
      expect(await legacyCertificates()).toHaveLength(0);
      expect(await legacyEnrollment()).toBe("active");

      // そのレッスンの課題への提出の合格なら数え、修了する。
      await legacyReview("legacy-code", "exercise", "pass");
      expect(await passedAssignments()).toEqual([1, 1]);
      expect(await legacyCertificates()).toHaveLength(1);
      expect(await legacyEnrollment()).toBe("completed");
    });
  });
});
