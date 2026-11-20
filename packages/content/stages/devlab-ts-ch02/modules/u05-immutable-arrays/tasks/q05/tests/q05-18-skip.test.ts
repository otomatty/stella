// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { skip } from "../src/q05-18-skip";
test("問18 skip", () => {
  expect(skip([1, 2, 3, 4], 2)).toEqual([3, 4]);
  expect(skip([1], 5)).toEqual([]);
  expectTypeOf(skip).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(skip).returns.toEqualTypeOf<number[]>();
});
