// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { quadrant } from "../src/q01-12-quadrant";
test("問12 quadrant", () => {
  expect(quadrant(1, 2)).toBe(1);
  expect(quadrant(-1, 2)).toBe(2);
  expect(quadrant(-1, -2)).toBe(3);
  expect(quadrant(1, -2)).toBe(4);
  expect(quadrant(0, 5)).toBe(0);
  expectTypeOf(quadrant).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(quadrant).returns.toEqualTypeOf<0 | 1 | 2 | 3 | 4>();
});
