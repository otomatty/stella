// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shapeArea, type Shape } from "../src/q04-01-shape-area";
test("問1 shapeArea", () => {
  expect(shapeArea({ kind: "circle", radius: 1 })).toBeCloseTo(Math.PI);
  expect(shapeArea({ kind: "square", size: 3 })).toBe(9);
  expect(shapeArea({ kind: "rect", width: 2, height: 5 })).toBe(10);
  expectTypeOf(shapeArea).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeArea).returns.toEqualTypeOf<number>();
});
