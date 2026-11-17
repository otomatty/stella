// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bothPresent } from "../src/q03-18-both-present";
test("問18 bothPresent", () => {
  expect(bothPresent("a", "b")).toBe(true);
  expect(bothPresent("a", null)).toBe(false);
  expectTypeOf(bothPresent).parameters.toEqualTypeOf<[string | null, string | null]>();
  expectTypeOf(bothPresent).returns.toEqualTypeOf<boolean>();
});
