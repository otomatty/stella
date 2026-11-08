// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countUpper } from "../src/q03-10-count-upper";
test("問10 countUpper", () => {
  expect(countUpper("TypeScript")).toBe(2);
  expect(countUpper("abc")).toBe(0);
  expectTypeOf(countUpper).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countUpper).returns.toEqualTypeOf<number>();
});
