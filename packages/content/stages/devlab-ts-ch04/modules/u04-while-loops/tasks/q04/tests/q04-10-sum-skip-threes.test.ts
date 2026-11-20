// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumSkipThrees } from "../src/q04-10-sum-skip-threes";
test("問10 sumSkipThrees", () => {
  expect(sumSkipThrees(6)).toBe(12);
  expect(sumSkipThrees(2)).toBe(3);
  expect(sumSkipThrees(0)).toBe(0);
  expectTypeOf(sumSkipThrees).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(sumSkipThrees).returns.toEqualTypeOf<number>();
});
