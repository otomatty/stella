// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { upperOrEmpty } from "../src/q03-02-upper-or-empty";
test("問2 upperOrEmpty", () => {
  expect(upperOrEmpty("abc")).toBe("ABC");
  expect(upperOrEmpty(null)).toBe("");
  expectTypeOf(upperOrEmpty).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(upperOrEmpty).returns.toEqualTypeOf<string>();
});
