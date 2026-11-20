// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { swapXY } from "../src/q06-19-swap-xy";
test("問19 swapXY", () => {
  expect(swapXY([1, 2])).toEqual([2, 1]);
  expectTypeOf(swapXY).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(swapXY).returns.toEqualTypeOf<[number, number]>();
});
