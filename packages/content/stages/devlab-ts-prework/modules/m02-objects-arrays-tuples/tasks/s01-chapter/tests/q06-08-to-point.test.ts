// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toPoint } from "../src/q06-08-to-point";
test("問8 toPoint", () => {
  expect(toPoint(1, 2)).toEqual([1, 2]);
  expectTypeOf(toPoint).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(toPoint).returns.toEqualTypeOf<[number, number]>();
});
