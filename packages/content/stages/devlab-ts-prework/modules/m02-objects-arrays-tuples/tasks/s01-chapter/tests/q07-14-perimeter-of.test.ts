// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { perimeterOf, type Paper, type Box } from "../src/q07-14-perimeter-of";
test("問14 perimeterOf", () => {
  const paper: Paper = { width: 3, height: 4 };
  const box: Box = { width: 1, height: 1, depth: 9 };
  expect(perimeterOf(paper)).toBe(14);
  expect(perimeterOf(box)).toBe(4);
  expectTypeOf(perimeterOf).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(perimeterOf).returns.toEqualTypeOf<number>();
});
