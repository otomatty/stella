import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../db/client.js";
import {
  enrollments,
  lessonProgress,
  lessons,
  profiles,
  sections,
  stages,
  taskProblemResults,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { reportsRoute } from "./reports.js";

describe("受講状況レポートの問題レッスン (実 SQLite)", () => {
  const fixture = sqliteD1();
  const env = { DB: fixture.binding, AUTH_JWT_SECRET: "test-secret" } as Env;
  const db = getDb(env);
  afterEach(() => fixture.sqlite.close());

  it("動画 1 本と提出済みの問題 1 問を 2/2 と数え、写しが残っても 1 回だけ数える", async () => {
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "learner", displayName: "受講者", role: "student" },
        { id: "boss", displayName: "管理者", role: "admin" },
      ]),
      db.insert(stages).values({ id: "stage", slug: "stage", title: "ステージ" }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "単元" }),
      db.insert(lessons).values([
        { id: "video", sectionId: "unit", title: "動画", type: "video" },
        {
          id: "problem",
          sectionId: "unit",
          title: "問1",
          type: "text",
          problemTaskId: "task",
          problemId: "q01",
        },
      ]),
      db.insert(tasks).values({
        id: "task",
        sectionId: "unit",
        title: "課題",
        kind: "practice",
        pattern: "example",
        estimatedMinutes: 5,
        order: 1,
        contentHash: "hash",
        definition: "{}",
        bundle: "{}",
      }),
      db.insert(taskProblemResults).values({
        userId: "learner",
        taskId: "task",
        problemId: "q01",
        contentHash: "hash",
        path: "src/q01.ts",
        code: "code",
        sha256: "sha",
        firstPassedAt: new Date(1),
        updatedAt: new Date(1),
      }),
      db.insert(lessonProgress).values({ userId: "learner", lessonId: "video", completed: true }),
      db.insert(enrollments).values({ userId: "learner", stageId: "stage", status: "active" }),
    ]);
    const { app } = mountTestApp(env, reportsRoute);
    const token = await signAccessToken("test-secret", "boss", "boss@example.com");
    const report = async () => {
      const response = await request(app, env, "/api/reports/enrollments", { token });
      expect(response.status, await response.clone().text()).toBe(200);
      return (
        await json<{
          report: {
            rows: {
              user_id: string;
              completed_lessons: number;
              total_lessons: number;
              progress_pct: number;
            }[];
          };
        }>(response)
      ).report.rows;
    };
    expect(await report()).toEqual([
      expect.objectContaining({
        user_id: "learner",
        completed_lessons: 2,
        total_lessons: 2,
        progress_pct: 100,
      }),
    ]);

    await db.insert(lessonProgress).values({
      userId: "learner",
      lessonId: "problem",
      completed: true,
    });
    expect(await report()).toEqual([
      expect.objectContaining({ completed_lessons: 2, total_lessons: 2, progress_pct: 100 }),
    ]);
  });
});
