import { describe, expect, expectTypeOf, test } from "vitest";
import { type Scores, passedNames, topScorer, totalScore } from "../src/e02-loop-object";

const scores: Scores = { 山田: 72, 佐藤: 91, 鈴木: 58, 高橋: 91 };

describe("totalScore", () => {
  test("合計を返す", () => {
    expect(totalScore(scores)).toBe(312);
    expect(totalScore({})).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(totalScore).parameters.toEqualTypeOf<[Scores]>();
    expectTypeOf(totalScore).returns.toEqualTypeOf<number>();
  });
});

describe("topScorer", () => {
  test("最高得点の人を返す。同点なら先に出てきた人", () => {
    expect(topScorer(scores)).toBe("佐藤");
  });

  test("空なら undefined", () => {
    expect(topScorer({})).toBeUndefined();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(topScorer).parameters.toEqualTypeOf<[Scores]>();
    expectTypeOf(topScorer).returns.toEqualTypeOf<string | undefined>();
  });
});

describe("passedNames", () => {
  test("border 点以上の人を、出てきた順に返す", () => {
    expect(passedNames(scores, 70)).toEqual(["山田", "佐藤", "高橋"]);
    expect(passedNames(scores, 100)).toEqual([]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(passedNames).parameters.toEqualTypeOf<[Scores, number]>();
    expectTypeOf(passedNames).returns.toEqualTypeOf<string[]>();
  });
});
