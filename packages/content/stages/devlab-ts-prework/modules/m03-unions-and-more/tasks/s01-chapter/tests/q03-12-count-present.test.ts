// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countPresent } from "../src/q03-12-count-present";
test("問12 countPresent", () => {
  expect(countPresent(["a", undefined, "b"])).toBe(2);
  expect(countPresent([])).toBe(0);
  expectTypeOf(countPresent).parameters.toEqualTypeOf<[readonly (string | undefined)[]]>();
  expectTypeOf(countPresent).returns.toEqualTypeOf<number>();
});
