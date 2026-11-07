// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isSquareShape, type Box, type Paper } from "../src/q07-06-is-square-shape";
test("問6 isSquareShape", () => {
  const box: Box = { width: 10, height: 10, depth: 30 };
  const paper: Paper = { width: 210, height: 297 };
  expect(isSquareShape(box)).toBe(true);
  expect(isSquareShape(paper)).toBe(false);
  expectTypeOf(isSquareShape).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(isSquareShape).returns.toEqualTypeOf<boolean>();
});
