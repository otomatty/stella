// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shapeArea, type Shape } from "../src/q07-07-shape-area";
test("問7 shapeArea", () => {
  expect(shapeArea({ kind: "circle", radius: 2 })).toBeCloseTo(4 * Math.PI);
  expect(shapeArea({ kind: "square", size: 3 })).toBe(9);
  expectTypeOf(shapeArea).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeArea).returns.toEqualTypeOf<number>();
});
