// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shapePerimeter, type Shape } from "../src/q04-03-shape-perimeter";
test("問3 shapePerimeter", () => {
  expect(shapePerimeter({ kind: "circle", radius: 1 })).toBeCloseTo(2 * Math.PI);
  expect(shapePerimeter({ kind: "square", size: 3 })).toBe(12);
  expect(shapePerimeter({ kind: "rect", width: 2, height: 3 })).toBe(10);
  expectTypeOf(shapePerimeter).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapePerimeter).returns.toEqualTypeOf<number>();
});
