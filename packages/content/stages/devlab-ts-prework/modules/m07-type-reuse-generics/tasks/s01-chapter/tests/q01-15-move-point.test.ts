// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { movePoint } from "../src/q01-15-move-point";
test("問15 movePoint", () => {
  expect(movePoint({ x: 1, y: 2 }, 3, 4)).toEqual({ x: 4, y: 6 });
  expectTypeOf(movePoint).parameters.toEqualTypeOf<[{ x: number; y: number }, number, number]>();
  expectTypeOf(movePoint).returns.toEqualTypeOf<{ x: number; y: number }>();
});
