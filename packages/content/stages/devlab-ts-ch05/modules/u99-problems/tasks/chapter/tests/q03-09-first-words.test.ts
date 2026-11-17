// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstWords } from "../src/q03-09-first-words";
test("問9 firstWords", () => {
  expect(firstWords("a b c d", 2)).toBe("a b");
  expect(firstWords("a b c d")).toBe("a");
  expectTypeOf(firstWords).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(firstWords).returns.toEqualTypeOf<string>();
});
