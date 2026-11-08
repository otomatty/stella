// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { take } from "../src/q05-17-take";
test("問17 take", () => {
  expect(take([1, 2, 3, 4], 2)).toEqual([1, 2]);
  expect(take([1], 5)).toEqual([1]);
  expectTypeOf(take).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(take).returns.toEqualTypeOf<number[]>();
});
