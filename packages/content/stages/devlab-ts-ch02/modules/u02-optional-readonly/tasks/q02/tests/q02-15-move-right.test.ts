// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { moveRight } from "../src/q02-15-move-right";
test("問15 moveRight", () => {
  const point = { x: 1, y: 2 };
  expect(moveRight(point)).toEqual({ x: 2, y: 2 });
  expect(point).toEqual({ x: 1, y: 2 });
  expectTypeOf(moveRight).parameters.toEqualTypeOf<[{ readonly x: number; readonly y: number }]>();
  expectTypeOf(moveRight).returns.toEqualTypeOf<{ readonly x: number; readonly y: number }>();
});
