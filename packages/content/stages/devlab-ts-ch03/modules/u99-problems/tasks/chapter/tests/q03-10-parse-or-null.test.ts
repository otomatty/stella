// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseOrNull } from "../src/q03-10-parse-or-null";
test("問10 parseOrNull", () => {
  expect(parseOrNull("42")).toBe(42);
  expect(parseOrNull("abc")).toBeNull();
  expectTypeOf(parseOrNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseOrNull).returns.toEqualTypeOf<number | null>();
});
