// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { expandRange } from "../src/q06-15-expand-range";
test("問15 expandRange", () => {
  expect(expandRange([2, 5])).toEqual([2, 3, 4, 5]);
  expect(expandRange([3, 3])).toEqual([3]);
  expectTypeOf(expandRange).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(expandRange).returns.toEqualTypeOf<number[]>();
});
