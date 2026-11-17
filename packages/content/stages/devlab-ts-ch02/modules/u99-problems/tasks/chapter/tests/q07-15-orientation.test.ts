// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { orientation, type Paper, type Box } from "../src/q07-15-orientation";
test("問15 orientation", () => {
  const paper: Paper = { width: 210, height: 297 };
  const box: Box = { width: 30, height: 20, depth: 10 };
  expect(orientation(paper)).toBe("縦長");
  expect(orientation(box)).toBe("横長");
  expect(orientation({ width: 1, height: 1 })).toBe("正方形");
  expectTypeOf(orientation).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(orientation).returns.toEqualTypeOf<"横長" | "縦長" | "正方形">();
});
