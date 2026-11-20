// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scaleShape, type Shape } from "../src/q07-19-scale-shape";
test("問19 scaleShape", () => {
  expect(scaleShape({ kind: "square", size: 2 }, 3)).toEqual({ kind: "square", size: 6 });
  expect(scaleShape({ kind: "circle", radius: 1 }, 2)).toEqual({ kind: "circle", radius: 2 });
  expectTypeOf(scaleShape).parameters.toEqualTypeOf<[Shape, number]>();
  expectTypeOf(scaleShape).returns.toEqualTypeOf<Shape>();
});
