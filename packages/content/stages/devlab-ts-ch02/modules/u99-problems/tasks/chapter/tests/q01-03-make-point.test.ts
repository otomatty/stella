// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makePoint } from "../src/q01-03-make-point";
test("問3 makePoint", () => {
  expect(makePoint(1, 2)).toEqual({ x: 1, y: 2 });
  expectTypeOf(makePoint).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(makePoint).returns.toEqualTypeOf<{ x: number; y: number }>();
});
