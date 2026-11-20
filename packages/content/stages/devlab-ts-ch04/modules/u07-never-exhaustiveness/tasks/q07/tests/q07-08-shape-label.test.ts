// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shapeLabel, type Shape } from "../src/q07-08-shape-label";
test("問8 shapeLabel", () => {
  expect(shapeLabel({ kind: "circle", radius: 2 })).toBe("円（半径 2）");
  expect(shapeLabel({ kind: "square", size: 3 })).toBe("正方形（1辺 3）");
  expectTypeOf(shapeLabel).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeLabel).returns.toEqualTypeOf<string>();
});
