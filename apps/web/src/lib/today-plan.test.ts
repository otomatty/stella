import { describe, expect, it } from "vitest";

import { buildTodayPlan, TODAY_PLAN_MAX_MINUTES } from "./today-plan";

const ACTIVE = {
  stageTitle: "TypeScript 入門研修",
  nextLessonTitle: "型注釈の基本",
  remainingLessons: 8,
};

describe("buildTodayPlan", () => {
  it("材料が無ければ空のプラン", () => {
    const plan = buildTodayPlan({ srsDueCount: 0 });
    expect(plan.items).toEqual([]);
    expect(plan.totalMinutes).toBe(0);
  });

  it("復習を先に置く (時効があるものから)", () => {
    const plan = buildTodayPlan({ srsDueCount: 12, activeStage: ACTIVE });
    expect(plan.items.map((i) => i.kind)).toEqual(["review", "lesson"]);
  });

  it("復習の見積りは 3〜10 分に収める", () => {
    expect(buildTodayPlan({ srsDueCount: 1 }).totalMinutes).toBe(3);
    expect(buildTodayPlan({ srsDueCount: 12 }).totalMinutes).toBe(8);
    expect(buildTodayPlan({ srsDueCount: 200 }).totalMinutes).toBe(10);
  });

  it("合計は 30 分を超えない", () => {
    const plan = buildTodayPlan({
      srsDueCount: 20,
      activeStage: ACTIVE,
      recentMiss: { title: "配列の課題", kind: "submission" },
    });
    expect(plan.totalMinutes).toBeLessThanOrEqual(TODAY_PLAN_MAX_MINUTES);
  });

  it("残り時間に収まるだけレッスンを束ねる", () => {
    const plan = buildTodayPlan({ srsDueCount: 0, activeStage: ACTIVE });
    const lesson = plan.items.find((i) => i.kind === "lesson");
    expect(lesson?.minutes).toBe(30);
    expect(lesson?.title).toContain("ほか 1 本");
  });

  it("残りが 1 レッスンなら 1 本だけ", () => {
    const plan = buildTodayPlan({
      srsDueCount: 0,
      activeStage: { ...ACTIVE, remainingLessons: 1 },
    });
    expect(plan.items[0]?.title).toBe("型注釈の基本");
    expect(plan.items[0]?.minutes).toBe(15);
  });

  it("復習で埋まっていても次の 1 本は必ず出す", () => {
    const plan = buildTodayPlan({ srsDueCount: 200, activeStage: ACTIVE });
    const lesson = plan.items.find((i) => i.kind === "lesson");
    expect(lesson?.minutes).toBe(15);
    expect(plan.items.map((i) => i.kind)).toEqual(["review", "lesson"]);
  });

  it("残りレッスンが 0 ならレッスン項目を出さない", () => {
    const plan = buildTodayPlan({
      srsDueCount: 3,
      activeStage: { ...ACTIVE, remainingLessons: 0 },
    });
    expect(plan.items.map((i) => i.kind)).toEqual(["review"]);
  });

  it("つまずきの見直しは余りがあるときだけ足す", () => {
    // 復習 8 分 + レッスン 15 分 = 23 分。目標 (20 分) に届いているので足さない。
    const tight = buildTodayPlan({
      srsDueCount: 12,
      activeStage: ACTIVE,
      recentMiss: { title: "配列の課題", kind: "submission" },
    });
    expect(tight.items.map((i) => i.kind)).toEqual(["review", "lesson"]);

    const roomy = buildTodayPlan({
      srsDueCount: 0,
      activeStage: { ...ACTIVE, remainingLessons: 1 },
      recentMiss: { title: "配列の課題", kind: "submission" },
    });
    expect(roomy.items.map((i) => i.kind)).toEqual(["lesson", "miss"]);
    expect(roomy.totalMinutes).toBe(20);
  });

  it("つまずきの理由は出どころで書き分ける", () => {
    const quiz = buildTodayPlan({
      srsDueCount: 0,
      recentMiss: { title: "第 2 章の確認テスト", kind: "quiz" },
    });
    expect(quiz.items[0]?.reason).toContain("確認テスト");
    const submission = buildTodayPlan({
      srsDueCount: 0,
      recentMiss: { title: "配列の課題", kind: "submission" },
    });
    expect(submission.items[0]?.reason).toContain("再提出");
  });

  it("すべての項目に理由と分数が付く", () => {
    const plan = buildTodayPlan({
      srsDueCount: 5,
      activeStage: { ...ACTIVE, remainingLessons: 1 },
      recentMiss: { title: "配列の課題", kind: "submission" },
    });
    expect(plan.items.length).toBe(3);
    for (const item of plan.items) {
      expect(item.reason.length).toBeGreaterThan(0);
      expect(item.minutes).toBeGreaterThan(0);
    }
    expect(plan.totalMinutes).toBe(plan.items.reduce((n, i) => n + i.minutes, 0));
  });

  it("負の due 数でも壊れない", () => {
    expect(buildTodayPlan({ srsDueCount: -3 }).items).toEqual([]);
  });
});
