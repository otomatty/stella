// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isAllUpper } from "../src/q01-05-is-all-upper";
test("問5 isAllUpper", () => {
  expect(isAllUpper("ABC")).toBe(true);
  expect(isAllUpper("AbC")).toBe(false);
  expect(isAllUpper("123")).toBe(false);
  expectTypeOf(isAllUpper).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isAllUpper).returns.toEqualTypeOf<boolean>();
});
