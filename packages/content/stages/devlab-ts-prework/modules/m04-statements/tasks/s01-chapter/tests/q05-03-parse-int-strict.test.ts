// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseIntStrict } from "../src/q05-03-parse-int-strict";
test("問3 parseIntStrict", () => {
  expect(parseIntStrict("42")).toBe(42);
  expect(parseIntStrict("-12")).toBe(-12);
  expect(() => parseIntStrict("1.5")).toThrow("整数ではありません: 1.5");
  expect(() => parseIntStrict("12px")).toThrow("整数ではありません: 12px");
  expectTypeOf(parseIntStrict).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseIntStrict).returns.toEqualTypeOf<number>();
});
