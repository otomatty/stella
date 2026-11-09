// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sizeText, type Paper } from "../src/q07-20-size-text";
test("問20 sizeText", () => {
  const paper: Paper = { width: 210, height: 297 };
  expect(sizeText(paper)).toBe("210 × 297");
  expectTypeOf(sizeText).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(sizeText).returns.toEqualTypeOf<string>();
});
