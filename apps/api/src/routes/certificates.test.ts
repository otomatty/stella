import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GradebookEntry, StageCompletion } from "@stella/shared/cms/types";
import { getDb } from "../db/client.js";
import {
  enrollments,
  lessonProgress,
  lessons,
  profiles,
  quizAttempts,
  quizzes,
  sections,
  stages,
  submissions,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { D1_MAX_BOUND_PARAMS } from "../lib/enrollment-bulk.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { certificatesRoute } from "./certificates.js";

describe("大量のレッスンと受講者の修了状況 (実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let token: string;
  let instructorToken: string;
  let bindings: { sql: string; count: number }[];
  const expectedCounts = {
    total_lessons: 210,
    completed_lessons: 150,
    total_quizzes: 105,
    passed_quizzes: 101,
    total_assignments: 105,
    passed_assignments: 102,
    met: false,
  };

  beforeEach(async () => {
    database = sqliteD1();
    bindings = [];
    const prepare = database.binding.prepare.bind(database.binding);
    database.binding.prepare = (sql) => {
      const statement = prepare(sql);
      const bind = statement.bind.bind(statement);
      statement.bind = (...params) => {
        bindings.push({ sql, count: params.length });
        return bind(...params);
      };
      return statement;
    };
    env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as Env;
    const db = getDb(env);
    await db.insert(tenants).values({ id: "ses", name: "テスト" });
    await db.batch([
      db.insert(profiles).values({ id: "teacher", displayName: "講師", role: "admin" }),
      db.insert(stages).values({
        id: "big",
        slug: "big",
        title: "大きなステージ",
        format: 1,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "big", title: "単元" }),
    ]);
    // 各 INSERT も D1 のバインド上限内になるよう、1 行ずつ batch に並べる。
    for (let i = 0; i < 120; i++) {
      const userId = i === 0 ? "learner" : `learner-${i}`;
      await db.batch([
        db.insert(profiles).values({ id: userId, displayName: `受講者${i}`, role: "student" }),
        db.insert(enrollments).values({ userId, stageId: "big", status: "active" }),
      ]);
    }
    for (let i = 0; i < 210; i++) {
      await db.insert(lessons).values({
        id: `lesson-${i}`,
        sectionId: "unit",
        title: `レッスン${i}`,
        type: i < 105 ? "quiz" : "assignment",
      });
      if (i < 105) {
        await db.insert(quizzes).values({ id: `quiz-${i}`, lessonId: `lesson-${i}` });
        if (i < 101) {
          await db.insert(quizAttempts).values({
            quizId: `quiz-${i}`,
            userId: "learner",
            score: 100,
            maxScore: 100,
            passed: true,
          });
        }
      } else if (i < 207) {
        await db.insert(submissions).values({
          studentId: "learner",
          lessonId: `lesson-${i}`,
          stageTitle: "大きなステージ",
          assignmentTitle: `課題${i}`,
          code: "",
          verdict: "pass",
        });
      }
      if (i < 150) {
        await db.insert(lessonProgress).values({
          userId: "learner",
          lessonId: `lesson-${i}`,
          completed: true,
        });
      }
    }
    token = await signAccessToken("test-secret", "learner", "learner@example.com");
    instructorToken = await signAccessToken("test-secret", "teacher", "teacher@example.com");
  });
  afterEach(() => database.sqlite.close());

  function expectProgressQueries() {
    for (const table of ["lesson_progress", "quiz_attempts", "submissions"]) {
      expect(bindings.some((b) => b.sql.includes(`from "${table}"`))).toBe(true);
    }
  }

  it("各種 id が 100 件を超えても本人の修了状況をバインド上限内で返す", async () => {
    const { app } = mountTestApp(env, certificatesRoute);
    bindings.length = 0;
    const response = await request(app, env, "/api/certificates/completion/big", { token });
    expect(response.status, await response.clone().text()).toBe(200);
    const { completion } = await json<{ completion: StageCompletion }>(response);
    expect(completion).toMatchObject(expectedCounts);
    expect(bindings.filter((b) => b.count > D1_MAX_BOUND_PARAMS)).toEqual([]);
    expectProgressQueries();
  });

  it("120 人の成績台帳をバインド上限内で返し、受講者ごとの達成数を保つ", async () => {
    const { app } = mountTestApp(env, certificatesRoute);
    bindings.length = 0;
    const response = await request(app, env, "/api/certificates/gradebook/big", {
      token: instructorToken,
    });
    expect(response.status, await response.clone().text()).toBe(200);
    const { gradebook } = await json<{ gradebook: { rows: GradebookEntry[] } }>(response);
    expect(gradebook.rows).toHaveLength(120);
    expect(gradebook.rows.find((r) => r.user_id === "learner")?.completion).toMatchObject(
      expectedCounts,
    );
    for (const row of gradebook.rows.filter((r) => r.user_id !== "learner")) {
      expect(row.completion).toMatchObject({
        ...expectedCounts,
        completed_lessons: 0,
        passed_quizzes: 0,
        passed_assignments: 0,
      });
    }
    expect(bindings.filter((b) => b.count > D1_MAX_BOUND_PARAMS)).toEqual([]);
    expectProgressQueries();
    expect(
      bindings.filter((b) => b.sql.includes('from "certificates"')).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
