// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { line } from "../src/q02-20-line";
test("問20 line", () => {
  expect(line("=", 5)).toBe("=====");
  expect(line("-", 1)).toBe("-");
  expectTypeOf(line).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(line).returns.toEqualTypeOf<string>();
});
