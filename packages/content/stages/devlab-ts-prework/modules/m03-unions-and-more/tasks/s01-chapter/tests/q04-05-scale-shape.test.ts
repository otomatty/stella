// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scaleShape, type Shape } from "../src/q04-05-scale-shape";
test("問5 scaleShape", () => {
  expect(scaleShape({ kind: "circle", radius: 1 }, 3)).toEqual({ kind: "circle", radius: 3 });
  expect(scaleShape({ kind: "square", size: 3 }, 2)).toEqual({ kind: "square", size: 6 });
  expect(scaleShape({ kind: "rect", width: 1, height: 2 }, 2)).toEqual({
    kind: "rect",
    width: 2,
    height: 4,
  });
  expectTypeOf(scaleShape).parameters.toEqualTypeOf<[Shape, number]>();
  expectTypeOf(scaleShape).returns.toEqualTypeOf<Shape>();
});
