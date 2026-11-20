// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumArea, type Box, type Paper } from "../src/q07-19-sum-area";
test("問19 sumArea", () => {
  const box: Box = { width: 2, height: 3, depth: 4 };
  const paper: Paper = { width: 1, height: 1 };
  expect(sumArea([box, paper])).toBe(7);
  expectTypeOf(sumArea).parameters.toEqualTypeOf<[readonly { width: number; height: number }[]]>();
  expectTypeOf(sumArea).returns.toEqualTypeOf<number>();
});
