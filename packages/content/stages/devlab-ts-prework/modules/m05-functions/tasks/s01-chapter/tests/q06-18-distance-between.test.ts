// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { distanceBetween } from "../src/q06-18-distance-between";
test("問18 distanceBetween", () => {
  expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  expectTypeOf(distanceBetween).parameters.toEqualTypeOf<
    [{ x: number; y: number }, { x: number; y: number }]
  >();
  expectTypeOf(distanceBetween).returns.toEqualTypeOf<number>();
});
