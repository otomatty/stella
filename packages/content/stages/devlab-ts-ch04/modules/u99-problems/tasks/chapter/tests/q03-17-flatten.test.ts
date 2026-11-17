// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { flatten } from "../src/q03-17-flatten";
test("問17 flatten", () => {
  expect(flatten([[1, 2], [3], []])).toEqual([1, 2, 3]);
  expect(flatten([])).toEqual([]);
  expectTypeOf(flatten).parameters.toEqualTypeOf<[readonly (readonly number[])[]]>();
  expectTypeOf(flatten).returns.toEqualTypeOf<number[]>();
});
