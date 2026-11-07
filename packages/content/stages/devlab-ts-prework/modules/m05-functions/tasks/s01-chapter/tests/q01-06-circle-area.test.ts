// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { circleArea } from "../src/q01-06-circle-area";
test("問6 circleArea", () => {
  expect(circleArea(1)).toBeCloseTo(Math.PI);
  expect(circleArea(0)).toBe(0);
  expectTypeOf(circleArea).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(circleArea).returns.toEqualTypeOf<number>();
});
