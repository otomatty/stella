// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstOf } from "../src/q06-07-first-of";
test("問7 firstOf", () => {
  expect(firstOf(["a", "b"])).toBe("a");
  expect(firstOf([])).toBeUndefined();
  expectTypeOf(firstOf).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(firstOf).returns.toEqualTypeOf<string | undefined>();
});
