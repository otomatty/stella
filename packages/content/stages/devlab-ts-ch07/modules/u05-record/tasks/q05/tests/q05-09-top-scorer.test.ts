// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { topScorer } from "../src/q05-09-top-scorer";
test("問9 topScorer", () => {
  expect(topScorer({ 山田: 70, 佐藤: 90 })).toBe("佐藤");
  expect(topScorer({})).toBeUndefined();
  expectTypeOf(topScorer).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(topScorer).returns.toEqualTypeOf<string | undefined>();
});
