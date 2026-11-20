// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { averageAll } from "../src/q05-07-average-all";
test("問7 averageAll", () => {
  expect(averageAll(2, 4, 9)).toBe(5);
  expect(averageAll()).toBe(0);
  expectTypeOf(averageAll).parameters.toEqualTypeOf<number[]>();
  expectTypeOf(averageAll).returns.toEqualTypeOf<number>();
});
