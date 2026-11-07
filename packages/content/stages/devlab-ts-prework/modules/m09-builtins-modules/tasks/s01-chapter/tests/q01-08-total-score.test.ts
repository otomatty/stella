// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { totalScore } from "../src/q01-08-total-score";
test("問8 totalScore", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(totalScore(scores)).toBe(145);
  expect(totalScore(new Map())).toBe(0);
  expectTypeOf(totalScore).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(totalScore).returns.toEqualTypeOf<number>();
});
