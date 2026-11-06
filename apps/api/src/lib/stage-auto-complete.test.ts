import { getDb } from "../db/client.js";
import {
  certificates,
  lessons,
  lessonProgress,
  profiles,
  quizzes,
  quizAttempts,
  sections,
  stages,
  submissions,
  tenants,
  tasks,
  taskProgress,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
/**
 * 修了条件の判定式 (`completionMet`) のユニットテスト。
 *
 * この式は手動発行 (`routes/certificates.ts` の completion 集計 2 か所) と自動発行の
 * 3 か所で共有される。DB 集計そのものは core-loop スモーク (添削合格 → 自動発行) が
 * 通しで検証するので、ここでは境界条件だけを固定する。
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  computeUserStageCompletions,
  completionMet,
  type CompletionCounts,
} from "./stage-auto-complete.js";

const ALL_REQUIRED = {
  requireAllLessons: true,
  requireQuizPass: true,
  requireAssignmentPass: true,
};

const counts = (over: Partial<CompletionCounts>): CompletionCounts => ({
  totalLessons: 3,
  completedLessons: 3,
  totalQuizzes: 2,
  passedQuizzes: 2,
  totalAssignments: 1,
  passedAssignments: 1,
  ...over,
});

describe("completionMet", () => {
  it("全条件を満たせば達成", () => {
    expect(completionMet(ALL_REQUIRED, counts({}))).toBe(true);
  });

  it("レッスン 0 件のステージは常に未達 (空ステージが作った瞬間に修了しない)", () => {
    expect(completionMet(ALL_REQUIRED, counts({ totalLessons: 0, completedLessons: 0 }))).toBe(
      false,
    );
  });

  it("必須条件が 1 つでも欠ければ未達", () => {
    expect(completionMet(ALL_REQUIRED, counts({ completedLessons: 2 }))).toBe(false);
    expect(completionMet(ALL_REQUIRED, counts({ passedQuizzes: 1 }))).toBe(false);
    expect(completionMet(ALL_REQUIRED, counts({ passedAssignments: 0 }))).toBe(false);
  });

  it("外した条件は数えない (小テスト・課題が任意のステージ)", () => {
    const lessonsOnly = {
      requireAllLessons: true,
      requireQuizPass: false,
      requireAssignmentPass: false,
    };
    expect(completionMet(lessonsOnly, counts({ passedQuizzes: 0, passedAssignments: 0 }))).toBe(
      true,
    );
  });

  it("小テスト・課題が 0 件なら、その条件は必須でも満たされる", () => {
    expect(
      completionMet(
        ALL_REQUIRED,
        counts({ totalQuizzes: 0, passedQuizzes: 0, totalAssignments: 0, passedAssignments: 0 }),
      ),
    ).toBe(true);
  });
});

describe("computeUserStageCompletions", () => {
  let database: ReturnType<typeof sqliteD1>;
  let db: ReturnType<typeof getDb>;
  beforeEach(async () => {
    database = sqliteD1();
    db = getDb({ DB: database.binding } as Env);
    await db.insert(tenants).values({ id: "ses", name: "SES" });
    await db.insert(profiles).values({ id: "learner", displayName: "受講者" });
  });
  afterEach(() => database.sqlite.close());

  it("169 レッスン・クイズ・課題と 100 超のステージを 100 バインド以下で正しく集計する", async () => {
    // sqliteD1 は全 SELECT / INSERT の bind が 100 を超えると例外を投げる。
    for (let i = 0; i < 105; i++) {
      await db.insert(stages).values({
        id: `stage-${i}`,
        slug: `stage-${i}`,
        title: `星 ${i}`,
        format: 2,
        requireAllLessons: true,
        requireQuizPass: true,
        requireAssignmentPass: true,
      });
    }
    await db.insert(sections).values({ id: "section", stageId: "stage-0", title: "単元" });
    for (let i = 0; i < 169; i++) {
      await db
        .insert(lessons)
        .values({ id: `lesson-${i}`, sectionId: "section", title: "課題", type: "assignment" });
      await db
        .insert(lessonProgress)
        .values({ userId: "learner", lessonId: `lesson-${i}`, completed: true });
      await db.insert(quizzes).values({ id: `quiz-${i}`, lessonId: `lesson-${i}` });
      // 同じクイズ・課題に複数の合格があっても 1 件。
      for (let attempt = 0; attempt < 2; attempt++) {
        await db
          .insert(quizAttempts)
          .values({ userId: "learner", quizId: `quiz-${i}`, score: 1, maxScore: 1, passed: true });
        await db.insert(submissions).values({
          studentId: "learner",
          lessonId: `lesson-${i}`,
          stageTitle: "星",
          assignmentTitle: "課題",
          code: "",
          verdict: "pass",
        });
      }
    }
    for (const [id, variantOf, active] of [
      ["task", null, true],
      ["variant", "task", true],
      ["inactive", null, false],
    ] as const) {
      await db.insert(tasks).values({
        id,
        sectionId: "section",
        title: id,
        kind: "practice",
        pattern: "p",
        estimatedMinutes: 1,
        order: 0,
        contentHash: "h",
        definition: "{}",
        bundle: "{}",
        variantOf,
        active,
      });
      await db
        .insert(taskProgress)
        .values({ userId: "learner", taskId: id, status: "ai-passed", contentHash: "old-hash" });
    }
    await db.insert(certificates).values({
      userId: "learner",
      stageId: "stage-0",
      certCode: "CODE",
      recipientName: "受講者",
      issuerName: "STELLA",
      stageTitle: "星",
      revoked: true,
    });
    const result = await computeUserStageCompletions(db, "learner", await db.select().from(stages));
    expect(result).toHaveLength(105);
    expect(result.find((row) => row.stage_id === "stage-0")).toMatchObject({
      user_id: "learner",
      total_lessons: 169,
      completed_lessons: 169,
      total_quizzes: 169,
      passed_quizzes: 169,
      total_assignments: 170,
      passed_assignments: 170,
      criteria: {
        require_all_lessons: true,
        require_quiz_pass: true,
        require_assignment_pass: true,
      },
      met: true,
      has_certificate: true,
      cert_code: "CODE",
    });
    expect(result.find((row) => row.stage_id === "stage-104")).toMatchObject({
      total_lessons: 0,
      met: false,
      has_certificate: false,
      cert_code: null,
    });
  });
  it("対象ステージがなければ空配列", async () => {
    expect(await computeUserStageCompletions(db, "learner", [])).toEqual([]);
  });
});
