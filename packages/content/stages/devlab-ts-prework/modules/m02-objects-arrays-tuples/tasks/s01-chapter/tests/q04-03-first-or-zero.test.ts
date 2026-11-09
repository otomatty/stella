// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstOrZero } from "../src/q04-03-first-or-zero";
test("問3 firstOrZero", () => {
  expect(firstOrZero([5, 6])).toBe(5);
  expect(firstOrZero([])).toBe(0);
  expectTypeOf(firstOrZero).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(firstOrZero).returns.toEqualTypeOf<number>();
});
