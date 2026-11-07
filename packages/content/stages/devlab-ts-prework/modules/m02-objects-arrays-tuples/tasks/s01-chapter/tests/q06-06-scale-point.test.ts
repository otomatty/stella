// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scalePoint } from "../src/q06-06-scale-point";
test("問6 scalePoint", () => {
  expect(scalePoint([1, 2], 3)).toEqual([3, 6]);
  expectTypeOf(scalePoint).parameters.toEqualTypeOf<[[number, number], number]>();
  expectTypeOf(scalePoint).returns.toEqualTypeOf<[number, number]>();
});
