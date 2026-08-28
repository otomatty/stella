import { describe, expect, it } from "vitest";

import { computeXp, levelFromXp, levelProgress, xpForLevel } from "./xp.js";

describe("computeXp", () => {
  it("10L + 30Q + 200S", () => {
    const xp = computeXp({ completedLessons: 4, passedQuizzes: 2, clearedStages: 1 });
    expect(xp.fromLessons).toBe(40);
    expect(xp.fromQuizzes).toBe(60);
    expect(xp.fromStages).toBe(200);
    expect(xp.total).toBe(300);
  });

  it("何もしていなければ 0", () => {
    expect(computeXp({ completedLessons: 0, passedQuizzes: 0, clearedStages: 0 }).total).toBe(0);
  });

  it("負値や小数は 0 / 切り捨てに丸める (集計クエリの取りこぼし対策)", () => {
    const xp = computeXp({ completedLessons: -3, passedQuizzes: 1.9, clearedStages: Number.NaN });
    expect(xp.completedLessons).toBe(0);
    expect(xp.passedQuizzes).toBe(1);
    expect(xp.clearedStages).toBe(0);
    expect(xp.total).toBe(30);
  });

  it("合格した発見教材は 1 つ 30 XP (Phase 4)", () => {
    const xp = computeXp({
      completedLessons: 0,
      passedQuizzes: 0,
      clearedStages: 0,
      passedDiscoveries: 2,
    });
    expect(xp.passedDiscoveries).toBe(2);
    expect(xp.fromDiscoveries).toBe(60);
    expect(xp.total).toBe(60);
  });

  it("発見教材を省略しても 0 として扱う (既存の呼び出しを壊さない)", () => {
    const xp = computeXp({ completedLessons: 1, passedQuizzes: 0, clearedStages: 0 });
    expect(xp.passedDiscoveries).toBe(0);
    expect(xp.fromDiscoveries).toBe(0);
    expect(xp.total).toBe(10);
  });
});

describe("xpForLevel / levelFromXp", () => {
  it("Lv1 は 0 から始まり、Lv2 までは 100", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(250);
    expect(xpForLevel(4)).toBe(450);
  });

  it("必要 XP は漸増する (曲線が寝ない)", () => {
    let previousStep = 0;
    for (let level = 1; level <= 60; level++) {
      const step = xpForLevel(level + 1) - xpForLevel(level);
      expect(step).toBeGreaterThan(previousStep);
      previousStep = step;
    }
  });

  it("逆関数として噛み合う", () => {
    for (let level = 1; level <= 200; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      // 境界の 1 手前はまだ前のレベル。
      if (level > 1) expect(levelFromXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it("XP に対して単調非減少", () => {
    let previous = 1;
    for (let xp = 0; xp <= 20000; xp += 7) {
      const level = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("0 未満・非数は Lv1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-500)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });
});

describe("levelProgress", () => {
  it("レベル内の進み具合を返す", () => {
    expect(levelProgress(0)).toEqual({
      level: 1,
      xpIntoLevel: 0,
      xpToNextLevel: 100,
      nextLevelAt: 100,
    });
    expect(levelProgress(160)).toEqual({
      level: 2,
      xpIntoLevel: 60,
      xpToNextLevel: 150,
      nextLevelAt: 250,
    });
  });

  it("xpIntoLevel は必ず 0 以上 xpToNextLevel 未満", () => {
    for (let xp = 0; xp <= 5000; xp += 13) {
      const p = levelProgress(xp);
      expect(p.xpIntoLevel).toBeGreaterThanOrEqual(0);
      expect(p.xpIntoLevel).toBeLessThan(p.xpToNextLevel);
    }
  });
});
