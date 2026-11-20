// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rangeOf } from "../src/q04-10-range-of";
test("問10 rangeOf", () => {
  expect(rangeOf(3)).toEqual([0, 1, 2]);
  expect(rangeOf(10, 2, 3)).toEqual([2, 5, 8]);
  expectTypeOf(rangeOf).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(rangeOf).returns.toEqualTypeOf<number[]>();
});
