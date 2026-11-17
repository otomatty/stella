// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lengths } from "../src/q04-06-lengths";
test("問6 lengths", () => {
  expect(lengths(["a", "bcd"])).toEqual([1, 3]);
  expect(lengths([])).toEqual([]);
  expectTypeOf(lengths).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(lengths).returns.toEqualTypeOf<number[]>();
});
