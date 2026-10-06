import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "./client.js";
import {
  auditLogs,
  certificates,
  enrollments,
  lessonProgress,
  lessons,
  profiles,
  sections,
  stages,
  studyActivity,
  submissions,
  tenants,
} from "./schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { certificatesRoute } from "../routes/certificates.js";
import { lessonProgressRoute } from "../routes/lesson-progress.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";

const TAG = "0046_reviewed_code_progress";
const SQL = readFileSync(
  fileURLToPath(new URL(`../../drizzle/${TAG}.sql`, import.meta.url)),
  "utf8",
);
const OLD = new Date("2026-01-01T00:00:00Z");

describe("0046: 既存の自己申告完了をレビュー合格に移行する (実SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let token: string;
  beforeEach(async () => {
    // 直前のスキーマに実データを入れ、その後で移行SQLを適用する。
    database = sqliteD1({ beforeMigration: TAG });
    env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as Env;
    db = getDb(env);
    await db.batch([
      db.insert(tenants).values([
        { id: "ses", name: "テスト" },
        { id: "another", name: "別" },
      ]),
      db.insert(profiles).values([
        { id: "learner", tenantId: "ses", role: "student", displayName: "受講者" },
        { id: "other", tenantId: "ses", role: "student", displayName: "別の受講者" },
      ]),
      db.insert(stages).values({ id: "legacy", tenantId: "ses", slug: "legacy", title: "旧講座" }),
      db.insert(sections).values({ id: "unit", stageId: "legacy", title: "演習" }),
      db.insert(lessons).values([
        { id: "code", sectionId: "unit", type: "code", title: "演習", assignmentId: "exercise" },
        { id: "text", sectionId: "unit", type: "text", title: "説明" },
      ]),
      db.insert(enrollments).values({
        tenantId: "ses",
        userId: "learner",
        stageId: "legacy",
        status: "completed",
        completedAt: OLD,
      }),
      db.insert(lessonProgress).values(
        ["code", "text"].map((lessonId) => ({
          tenantId: "ses",
          userId: "learner",
          lessonId,
          completed: true,
          lastPage: 3,
          viewedPages: [0, 1, 2, 3],
          watchedSec: 30,
          updatedAt: OLD,
        })),
      ),
      db.insert(certificates).values({
        id: "certificate",
        tenantId: "ses",
        userId: "learner",
        stageId: "legacy",
        certCode: "FLC-2026-0000-0001",
        recipientName: "受講者",
        stageTitle: "旧講座",
        tenantName: "テスト",
      }),
      db.insert(studyActivity).values({
        tenantId: "ses",
        userId: "learner",
        date: "2026-01-01",
        completedLessons: 2,
        watchedSec: 30,
      }),
    ]);
    token = await signAccessToken("test-secret", "learner", "learner@example.com");
  });
  afterEach(() => database.sqlite.close());

  const migrate = () => database.sqlite.exec(SQL);
  const progress = async () =>
    (await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, "code")))[0];
  const enrollment = async () => (await db.select().from(enrollments))[0];
  async function pass(overrides: Partial<typeof submissions.$inferInsert> = {}) {
    await db.insert(submissions).values({
      tenantId: "ses",
      studentId: "learner",
      lessonId: "code",
      assignmentId: "exercise",
      stageTitle: "旧講座",
      assignmentTitle: "演習",
      code: "x",
      verdict: "pass",
      ...overrides,
    });
  }

  it.each([OLD, new Date("2099-01-01T00:00:00Z")])(
    "%sの完了も再同期を待たず訂正し、同じ更新日時の再送で復活させない",
    async (updatedAt) => {
      await db.update(lessonProgress).set({ updatedAt }).where(eq(lessonProgress.lessonId, "code"));
      migrate();
      const corrected = await progress();
      expect(corrected).toMatchObject({
        completed: false,
        lastPage: 3,
        viewedPages: [0, 1, 2, 3],
        watchedSec: 30,
      });
      expect(corrected.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime());
      expect(await db.select().from(certificates)).toHaveLength(0);
      expect(await enrollment()).toMatchObject({ status: "active", completedAt: null });
      const { app } = mountTestApp(env, lessonProgressRoute);
      const read = await request(app, env, "/api/lesson-progress", { token });
      const { rows } = await json<{ rows: { lesson_id: string; completed: boolean }[] }>(read);
      expect(rows.find((r) => r.lesson_id === "code")?.completed).toBe(false);
      const synced = await request(app, env, "/api/lesson-progress", {
        method: "POST",
        token,
        body: JSON.stringify({
          rows: [
            {
              lesson_id: "code",
              completed: true,
              last_page: 3,
              viewed_pages: [0, 1, 2, 3],
              watched_sec: 30,
              updated_at: updatedAt.toISOString(),
            },
          ],
        }),
      });
      expect(synced.status, await synced.clone().text()).toBe(200);
      expect((await progress()).completed).toBe(false);
      const certApp = mountTestApp(env, certificatesRoute).app;
      const certs = await request(certApp, env, "/api/certificates/mine", { token });
      expect(certs.status, await certs.clone().text()).toBe(200);
      expect((await json<{ rows: unknown[] }>(certs)).rows).toEqual([]);
      expect(await enrollment()).toMatchObject({ status: "active" });
      expect((await db.select().from(studyActivity))[0]).toMatchObject({
        completedLessons: 2,
        watchedSec: 30,
      });
    },
  );

  it("その受講者・テナント・レッスンの課題への合格は進捗・修了証とも残す", async () => {
    await pass();
    const before = await progress();
    migrate();
    expect(await progress()).toEqual(before);
    expect(await db.select().from(certificates)).toHaveLength(1);
    expect((await enrollment()).status).toBe("completed");
  });

  it.each([
    { assignmentId: "another-exercise" },
    { studentId: "other" },
    { tenantId: "another" },
    { verdict: "resubmit" as const },
  ])("%oは合格の根拠にしない", async (mismatch) => {
    await pass(mismatch);
    migrate();
    expect((await progress()).completed).toBe(false);
    expect(await db.select().from(certificates)).toHaveLength(0);
    expect((await enrollment()).status).toBe("active");
  });

  it.each([{ issuedBy: "teacher" }, { revoked: true }])(
    "%oの修了証は削除しない",
    async (preserved) => {
      await db.update(certificates).set(preserved);
      migrate();
      expect((await progress()).completed).toBe(false);
      expect(await db.select().from(certificates)).toHaveLength(1);
      expect((await enrollment()).status).toBe("completed");
    },
  );

  it.each([{ requireAllLessons: false, requireAssignmentPass: false }, { format: 2 }])(
    "%oなら訂正で修了条件は崩れず修了証を残す",
    async (preserved) => {
      await db.update(stages).set(preserved);
      migrate();
      expect((await progress()).completed).toBe(false);
      expect(await db.select().from(certificates)).toHaveLength(1);
      expect((await enrollment()).status).toBe("completed");
    },
  );

  it.each([
    { requireAllLessons: true, requireAssignmentPass: false },
    { requireAllLessons: false, requireAssignmentPass: true },
  ])("%oの必須条件だけでも満たさなくなる自動修了証を巻き戻す", async (required) => {
    await db.update(stages).set(required);
    migrate();
    expect(await db.select().from(certificates)).toHaveLength(0);
    expect((await enrollment()).status).toBe("active");
  });

  it("全受講者の既存行を訂正し、再適用しても学習ログや監査を増やさない", async () => {
    await db.insert(lessonProgress).values({
      tenantId: "ses",
      userId: "other",
      lessonId: "code",
      completed: true,
      updatedAt: OLD,
    });
    migrate();
    const once = await db.select().from(lessonProgress);
    expect(once.filter((r) => r.lessonId === "code").every((r) => !r.completed)).toBe(true);
    expect(once.find((r) => r.lessonId === "text")?.completed).toBe(true);
    const audits = await db.select().from(auditLogs);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: "certificate_reclaim",
      targetId: "certificate",
      metadata: {
        reason: "reviewed_code_progress_backfill",
        user_id: "learner",
        stage_id: "legacy",
      },
    });
    migrate();
    expect(await db.select().from(lessonProgress)).toEqual(once);
    expect(await db.select().from(auditLogs)).toEqual(audits);
    expect(database.sqlite.prepare("pragma foreign_key_check").all()).toEqual([]);
  });
});
