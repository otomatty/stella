// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { charCount } from "../src/q03-15-char-count";
test("問15 charCount", () => {
  expect(charCount("TypeScript")).toBe(10);
  expect(charCount("")).toBe(0);
  expectTypeOf(charCount).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(charCount).returns.toEqualTypeOf<number>();
});
