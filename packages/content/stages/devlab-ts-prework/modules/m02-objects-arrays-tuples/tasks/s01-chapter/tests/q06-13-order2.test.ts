// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { order2 } from "../src/q06-13-order2";
test("問13 order2", () => {
  expect(order2(5, 2)).toEqual([2, 5]);
  expect(order2(1, 3)).toEqual([1, 3]);
  expectTypeOf(order2).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(order2).returns.toEqualTypeOf<[number, number]>();
});
