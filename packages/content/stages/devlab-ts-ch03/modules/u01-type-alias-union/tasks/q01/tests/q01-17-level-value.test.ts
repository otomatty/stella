// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { levelValue, type Level } from "../src/q01-17-level-value";
test("問17 levelValue", () => {
  expectTypeOf<Level>().toEqualTypeOf<1 | 2 | 3 | "max">();
  expect(levelValue("max")).toBe(10);
  expect(levelValue(2)).toBe(2);
  expectTypeOf(levelValue).parameters.toEqualTypeOf<[Level]>();
  expectTypeOf(levelValue).returns.toEqualTypeOf<number>();
});
