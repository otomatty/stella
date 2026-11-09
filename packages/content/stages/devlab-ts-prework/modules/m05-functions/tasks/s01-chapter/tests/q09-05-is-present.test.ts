// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPresent } from "../src/q09-05-is-present";
test("問5 isPresent", () => {
  expect(isPresent("a")).toBe(true);
  expect(isPresent(null)).toBe(false);
  expectTypeOf(isPresent).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(isPresent).guards.toEqualTypeOf<string>();
});
