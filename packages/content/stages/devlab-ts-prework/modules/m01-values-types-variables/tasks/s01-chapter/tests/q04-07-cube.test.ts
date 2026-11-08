// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cube } from "../src/q04-07-cube";
test("問7 cube", () => {
  expect(cube(3)).toBe(27);
  expect(cube(-2)).toBe(-8);
  expectTypeOf(cube).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(cube).returns.toEqualTypeOf<number>();
});
