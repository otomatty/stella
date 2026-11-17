// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseIntOrZero } from "../src/q04-11-parse-int-or-zero";
test("問11 parseIntOrZero", () => {
  expect(parseIntOrZero("42px")).toBe(42);
  expect(parseIntOrZero("abc")).toBe(0);
  expect(parseIntOrZero("-7")).toBe(-7);
  expectTypeOf(parseIntOrZero).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseIntOrZero).returns.toEqualTypeOf<number>();
});
