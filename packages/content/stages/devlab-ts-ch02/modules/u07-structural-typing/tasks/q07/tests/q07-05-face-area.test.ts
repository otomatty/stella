// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { faceArea, type Box, type Paper } from "../src/q07-05-face-area";
test("問5 faceArea", () => {
  const box: Box = { width: 10, height: 20, depth: 30 };
  const paper: Paper = { width: 210, height: 297 };
  expect(faceArea(box)).toBe(200);
  expect(faceArea(paper)).toBe(62370);
  expectTypeOf(faceArea).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(faceArea).returns.toEqualTypeOf<number>();
});
