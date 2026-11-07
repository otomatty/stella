// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toUpper } from "../src/q05-02-to-upper";
test("問2 toUpper", () => {
  expect(toUpper("abc")).toBe("ABC");
  expect(toUpper("Type1")).toBe("TYPE1");
  expectTypeOf(toUpper).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toUpper).returns.toEqualTypeOf<string>();
});
