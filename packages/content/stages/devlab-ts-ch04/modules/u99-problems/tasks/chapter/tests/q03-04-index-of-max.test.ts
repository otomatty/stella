// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { indexOfMax } from "../src/q03-04-index-of-max";
test("問4 indexOfMax", () => {
  expect(indexOfMax([3, 9, 2])).toBe(1);
  expect(indexOfMax([5, 5])).toBe(0);
  expect(indexOfMax([])).toBe(-1);
  expectTypeOf(indexOfMax).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(indexOfMax).returns.toEqualTypeOf<number>();
});
