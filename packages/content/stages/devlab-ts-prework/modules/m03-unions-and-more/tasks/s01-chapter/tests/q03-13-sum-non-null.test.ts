// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumNonNull } from "../src/q03-13-sum-non-null";
test("問13 sumNonNull", () => {
  expect(sumNonNull([1, null, 2])).toBe(3);
  expect(sumNonNull([null])).toBe(0);
  expectTypeOf(sumNonNull).parameters.toEqualTypeOf<[readonly (number | null)[]]>();
  expectTypeOf(sumNonNull).returns.toEqualTypeOf<number>();
});
