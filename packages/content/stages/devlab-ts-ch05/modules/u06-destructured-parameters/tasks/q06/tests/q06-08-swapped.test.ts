// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { swapped } from "../src/q06-08-swapped";
test("問8 swapped", () => {
  expect(swapped([1, 2])).toEqual([2, 1]);
  expectTypeOf(swapped).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(swapped).returns.toEqualTypeOf<[number, number]>();
});
