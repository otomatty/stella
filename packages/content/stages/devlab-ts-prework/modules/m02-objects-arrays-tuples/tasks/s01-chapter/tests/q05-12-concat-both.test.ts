// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { concatBoth } from "../src/q05-12-concat-both";
test("問12 concatBoth", () => {
  const a = [1, 2];
  expect(concatBoth(a, [3])).toEqual([1, 2, 3]);
  expect(a).toEqual([1, 2]);
  expectTypeOf(concatBoth).parameters.toEqualTypeOf<[readonly number[], readonly number[]]>();
  expectTypeOf(concatBoth).returns.toEqualTypeOf<number[]>();
});
