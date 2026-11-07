// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { distanceFromOrigin } from "../src/q06-07-distance-from-origin";
test("問7 distanceFromOrigin", () => {
  expect(distanceFromOrigin([3, 4])).toBe(5);
  expect(distanceFromOrigin([0, 0])).toBe(0);
  expectTypeOf(distanceFromOrigin).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(distanceFromOrigin).returns.toEqualTypeOf<number>();
});
