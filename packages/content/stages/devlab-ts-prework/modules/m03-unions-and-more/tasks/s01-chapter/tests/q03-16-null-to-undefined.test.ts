// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nullToUndefined } from "../src/q03-16-null-to-undefined";
test("問16 nullToUndefined", () => {
  expect(nullToUndefined(null)).toBeUndefined();
  expect(nullToUndefined("a")).toBe("a");
  expectTypeOf(nullToUndefined).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(nullToUndefined).returns.toEqualTypeOf<string | undefined>();
});
