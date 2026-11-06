import { describe, expect, test } from "vitest";
import { allocateStudyHours } from "../src/study-plan.js";

describe("allocateStudyHours", () => {
  test("配点の割合で時間を配る", () => {
    const plan = allocateStudyHours(10, [
      { name: "API", weight: 50 },
      { name: "モデル", weight: 30 },
      { name: "ツール", weight: 20 },
    ]);
    expect(plan).toEqual([
      { name: "API", hours: 5 },
      { name: "モデル", hours: 3 },
      { name: "ツール", hours: 2 },
    ]);
  });

  test("配点の合計が 100 でなくても、合計に対する割合で配る", () => {
    const plan = allocateStudyHours(12, [
      { name: "API", weight: 1 },
      { name: "モデル", weight: 1 },
      { name: "ツール", weight: 2 },
    ]);
    expect(plan.map((item) => item.hours)).toEqual([3, 3, 6]);
  });

  test("時間は 0.5 時間単位に丸める", () => {
    const plan = allocateStudyHours(7, [
      { name: "API", weight: 1 },
      { name: "モデル", weight: 1 },
      { name: "ツール", weight: 1 },
    ]);
    expect(plan.map((item) => item.hours)).toEqual([2.5, 2.5, 2.5]);
  });

  test("範囲の順と名前はそのまま返す", () => {
    const plan = allocateStudyHours(4, [
      { name: "安全性", weight: 1 },
      { name: "評価", weight: 1 },
    ]);
    expect(plan.map((item) => item.name)).toEqual(["安全性", "評価"]);
  });
});
