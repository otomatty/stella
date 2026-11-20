// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countOf } from "../src/q05-15-count-of";
test("問15 countOf", () => {
  expect(countOf("a", "a", "b", "a")).toBe(2);
  expect(countOf("a")).toBe(0);
  expectTypeOf(countOf).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(countOf).returns.toEqualTypeOf<number>();
});
